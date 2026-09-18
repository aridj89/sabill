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
import { loadDatabase, saveDatabase } from "./dbHelpers.js";
import { INITIAL_DATA, sanitizeAndHashDatabase } from "./utils/db.js";
import nfcRoutes from "./routes/nfcRoutes.js";
import { nfcReaderService } from "./services/nfcReaderService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ─── HTTP Security Headers & CORS ────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",");
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Accès CORS bloqué par la politique de sécurité."));
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
    if (identifier === db.admin.username) {
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
 * GET /api/data — Safe Data Fetching
 */
app.get("/api/data", (req, res) => {
  const db = loadDatabase();

  // Strip hashed passwords before returning data to client
  const safeData = JSON.parse(JSON.stringify(db));
  if (safeData.admin) delete safeData.admin.password;
  if (safeData.students) safeData.students.forEach(st => delete st.password);
  if (safeData.parents) safeData.parents.forEach(p => delete p.password);

  res.json(safeData);
});

/**
 * POST /api/data — Protected Atomic Database Syncing
 */
app.post("/api/data", authenticateToken, (req, res, next) => {
  try {
    const newData = req.body;
    if (!newData || typeof newData !== "object") {
      return res.status(400).json({ success: false, message: "Format de données invalide." });
    }

    // Preserve existing hashed passwords if client sends updated data
    const existingDb = loadDatabase();
    if (newData.admin && !newData.admin.password) {
      newData.admin.password = existingDb.admin.password;
    }
    if (Array.isArray(newData.students)) {
      newData.students.forEach(st => {
        const existingSt = (existingDb.students || []).find(x => x.id === st.id);
        if (!st.password && existingSt) {
          st.password = existingSt.password;
        } else if (st.password) {
          st.password = hashPasswordSync(st.password);
        }
      });
    }

    const success = saveDatabase(newData);
    if (success) {
      res.json({ success: true, message: "Données sauvegardées en toute sécurité." });
    } else {
      res.status(500).json({ success: false, message: "Échec de la sauvegarde serveur." });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reset — Reset database (Admin only)
 */
app.post("/api/reset", authenticateToken, requireRole("admin"), (req, res) => {
  const clean = sanitizeAndHashDatabase(INITIAL_DATA);
  const success = saveDatabase(clean);
  if (success) {
    res.json({ success: true, message: "Base de données réinitialisée." });
  } else {
    res.status(500).json({ success: false, message: "Échec de la réinitialisation." });
  }
});

// ─── Serve Vite Frontend in Production ─────────────────────────
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Global Error Handler Middleware
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🔒 Serveur Express sécurisé démarré sur http://localhost:${PORT}`);
  // Start 5YOA NFC Reader Hardware Listener
  nfcReaderService.start();
});

// Graceful cleanup
function cleanup() {
  console.log("Fermeture du serveur et libération du lecteur NFC...");
  nfcReaderService.stop();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
