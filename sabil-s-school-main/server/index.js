import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { hashPasswordSync, comparePassword } from "./utils/password.js";
import { generateToken } from "./utils/jwt.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { loginRateLimiter, apiRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { DB_PATH } from "./db.js";
import { loadDatabase, saveDatabase } from "./dbHelpers.js";
import { startBackupScheduler, stopBackupScheduler, createSqliteBackup, exportDatabaseJson, BACKUP_DIR } from "./services/backupService.js";
import nfcRoutes from "./routes/nfcRoutes.js";
import { nfcReaderService } from "./services/nfcReaderService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

// ─── HTTP Security Headers & CORS ────────────────────────────
app.use(helmet());

// Security: Express rule explicitly blocking direct download access to database or backup files
app.use((req, res, next) => {
  const forbiddenExts = [".db", ".db-wal", ".db-shm", ".sqlite", ".sqlite3"];
  const lowerUrl = req.url.toLowerCase();
  
  if (
    forbiddenExts.some(ext => lowerUrl.includes(ext)) ||
    lowerUrl.includes("/backups") ||
    lowerUrl.includes("database.json") ||
    lowerUrl.includes("database-backup.json")
  ) {
    return res.status(403).json({ success: false, error: "Accès interdit aux fichiers système." });
  }
  next();
});

// Configure CORS for LAN multi-PC access (PC1, PC2...) & Production/Railway
const corsOriginEnv = process.env.CORS_ORIGIN;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !corsOriginEnv || corsOriginEnv === "*") {
      callback(null, true);
    } else {
      const allowed = corsOriginEnv.split(",").map(o => o.trim());
      if (allowed.includes(origin) || allowed.includes("*")) {
        callback(null, true);
      } else {
        // Fallback: allow local network private IP ranges (192.168.x.x, 10.x.x.x, 172.16.x.x)
        const isLan = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
        if (isLan) {
          callback(null, true);
        } else {
          callback(new Error("Accès CORS bloqué par la politique de sécurité."));
        }
      }
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(apiRateLimiter);

// ─── NFC Hardware Attendance API ─────────────────────────────
app.use("/api/nfc", nfcRoutes);

// ─── API Routes ───────────────────────────────────────────────

/**
 * POST /api/auth/login — Secure Authentication with Rate Limiting & JWT
 */
app.post("/api/auth/login", loginRateLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Identifiant et mot de passe requis." });
    }

    const db = loadDatabase();

    // 1. Check Admin
    if (db.admin && identifier === db.admin.username) {
      const match = await comparePassword(password, db.admin.password);
      if (match) {
        const token = generateToken({ id: "admin", role: "admin", username: db.admin.username });
        return res.json({
          success: true,
          role: "admin",
          token,
          user: { nom: db.admin.nom, prenom: db.admin.prenom, username: db.admin.username, avatar: db.admin.avatar },
        });
      }
    }

    // 2. Check Student (phone identifier)
    const student = (db.students || []).find(st => st.phone === identifier);
    if (student) {
      const match = await comparePassword(password, student.password);
      if (match) {
        const token = generateToken({ id: student.id, role: "student", phone: student.phone });
        return res.json({
          success: true,
          role: "student",
          token,
          studentId: student.id,
          user: { id: student.id, nom: student.nom, prenom: student.prenom, phone: student.phone },
        });
      }
    }

    // 3. Check Parent (telephone identifier)
    const parent = (db.parents || []).find(p => p.telephone === identifier);
    if (parent) {
      const match = await comparePassword(password, parent.password);
      if (match) {
        const token = generateToken({ id: parent.id, role: "parent", telephone: parent.telephone });
        return res.json({
          success: true,
          role: "parent",
          token,
          parentId: parent.id,
          user: { id: parent.id, nom: parent.nom, telephone: parent.telephone },
        });
      }
    }

    return res.status(401).json({ success: false, message: "Identifiants ou mot de passe incorrects." });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me — Get authenticated user details from JWT
 */
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

/**
 * GET /api/data — Safe Data Fetching from school.db (SQLite)
 */
app.get("/api/data", (req, res, next) => {
  try {
    const dbData = loadDatabase();

    // Strip hashed passwords before returning data to client
    const safeData = JSON.parse(JSON.stringify(dbData));
    if (safeData.admin) delete safeData.admin.password;
    if (safeData.students) safeData.students.forEach(st => delete st.password);
    if (safeData.parents) safeData.parents.forEach(p => delete p.password);

    res.json(safeData);
  } catch (err) {
    console.error("❌ GET /api/data error:", err.message);
    next(err);
  }
});

/**
 * POST /api/data — Protected Atomic Database Syncing into school.db (SQLite)
 */
app.post("/api/data", authenticateToken, (req, res, next) => {
  try {
    const newData = req.body;
    if (!newData || typeof newData !== "object") {
      return res.status(400).json({ success: false, message: "Format de données invalide." });
    }

    // Preserve existing hashed passwords if client sends updated data
    const existingDb = loadDatabase();
    if (newData.admin && !newData.admin.password && existingDb.admin) {
      newData.admin.password = existingDb.admin.password;
    }
    if (Array.isArray(newData.students)) {
      newData.students.forEach(st => {
        const existingSt = (existingDb.students || []).find(x => x.id === st.id);
        if (!st.password && existingSt) {
          st.password = existingSt.password;
        } else if (st.password && !st.password.startsWith("$2")) {
          st.password = hashPasswordSync(st.password);
        }
      });
    }

    const success = saveDatabase(newData);
    if (success) {
      // Export JSON backup asynchronously
      exportDatabaseJson();
      res.json({ success: true, message: "Données sauvegardées avec succès dans school.db." });
    } else {
      res.status(500).json({ success: false, message: "Échec de la sauvegarde في school.db." });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reset — Reset database (Admin only)
 */
app.post("/api/reset", authenticateToken, requireRole("admin"), (req, res) => {
  try {
    const defaultState = {
      admin: {
        nom: "Bensalem",
        prenom: "Karim",
        username: "admin",
        password: hashPasswordSync("admin1234"),
        avatar: "🧑‍🏫",
      },
      settings: { enrollmentFee: 500 },
      langLevels: [
        { id: "ll1", nom: "A1" },
        { id: "ll2", nom: "A2" },
        { id: "ll3", nom: "B1" },
      ],
      students: [],
      sessions: [],
      attendances: [],
      payments: [],
      parents: [],
      groups: [],
    };

    const success = saveDatabase(defaultState);
    if (success) {
      exportDatabaseJson();
      res.json({ success: true, message: "Base de données réinitialisée." });
    } else {
      res.status(500).json({ success: false, message: "Échec de la réinitialisation." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Global Error Handler Middleware
app.use(errorHandler);

const server = app.listen(PORT, HOST, () => {
  console.log(`🔒 Serveur Express centralisé démarré:`);
  console.log(`🗄️ Database path: ${DB_PATH}`);
  console.log(`📦 Backup directory: ${BACKUP_DIR}`);
  console.log(`🌐 Host: ${HOST}`);
  console.log(`🔌 Port: ${PORT}`);
  
  // Start NFC hardware listener
  nfcReaderService.start();

  // Start automatic backup scheduler
  startBackupScheduler(6);
});

// Graceful cleanup
function cleanup() {
  console.log("Fermeture du serveur et libération des ressources...");
  stopBackupScheduler();
  nfcReaderService.stop();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

