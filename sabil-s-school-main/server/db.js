import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPasswordSync } from "./utils/password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "school.db");
const JSON_PATH = path.join(__dirname, "database.json");

// ─── Open / Create the SQLite database ───────────────────────
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id      INTEGER PRIMARY KEY CHECK (id = 1),
    nom     TEXT NOT NULL,
    prenom  TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar  TEXT DEFAULT '🧑‍🏫'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lang_levels (
    id  TEXT PRIMARY KEY,
    nom TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS groups (
    id               TEXT PRIMARY KEY,
    nom              TEXT NOT NULL,
    categoryId       TEXT,
    levelId          TEXT,
    groupType        TEXT DEFAULT 'Normal',
    days             TEXT DEFAULT '[]',
    time             TEXT,
    startDate        TEXT,
    endDate          TEXT,
    sessionsPerCycle INTEGER DEFAULT 4,
    academicYearId   TEXT
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id               TEXT PRIMARY KEY,
    studentId        TEXT NOT NULL,
    academicYearId   TEXT,
    groupId          TEXT,
    monthlyPrice     REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS students (
    id             TEXT PRIMARY KEY,
    nom            TEXT NOT NULL,
    prenom         TEXT NOT NULL,
    phone          TEXT,
    password       TEXT,
    nfcCardId      TEXT DEFAULT '',
    enrollmentPaid INTEGER DEFAULT 0,
    enrollmentDate TEXT,
    lastModified   TEXT,
    createdAt      TEXT,
    accountStatus  TEXT DEFAULT 'active',
    studentCode    TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id             TEXT PRIMARY KEY,
    groupId        TEXT NOT NULL,
    academicYearId TEXT,
    date           TEXT NOT NULL,
    time           TEXT,
    status         TEXT DEFAULT 'planned',
    note           TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id          TEXT PRIMARY KEY,
    sessionId   TEXT,
    studentId   TEXT NOT NULL,
    present     INTEGER DEFAULT 1,
    date        TEXT,
    time        TEXT,
    nfcVerified INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payments (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS parents (
    id         TEXT PRIMARY KEY,
    nom        TEXT,
    telephone  TEXT,
    password   TEXT,
    data_json  TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS extra_sessions (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_notifications (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    type      TEXT,
    title     TEXT,
    message   TEXT,
    meta      TEXT DEFAULT '{}',
    date      TEXT,
    time      TEXT,
    read      INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS private_messages (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comm_categories (
    id  TEXT PRIMARY KEY,
    nom TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comm_groups (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comm_messages (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS groups_table (
    id        TEXT PRIMARY KEY,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS academic_years (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    isCurrent            INTEGER DEFAULT 0,
    startDate            TEXT,
    endDate              TEXT,
    enrollmentFee        REAL DEFAULT 500,
    enrollmentFeeEnabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS debt_carry_overs (
    id          TEXT PRIMARY KEY,
    studentId   TEXT NOT NULL,
    fromYearId  TEXT NOT NULL,
    toYearId    TEXT NOT NULL,
    amount      REAL NOT NULL,
    createdAt   TEXT
  );
`);

// ─── Schema Migration ────────────
try {
  // If subgroups exist and groups doesn't, we can try to migrate them over, 
  // but it's safe to just ignore since we are restructuring.
} catch (e) {
  console.warn("Migration warning:", e.message);
}

// ─── Auto-migrate from database.json if SQLite is empty ──────
const adminExists = db.prepare("SELECT COUNT(*) as c FROM admin").get().c;

if (adminExists === 0 && fs.existsSync(JSON_PATH)) {
  console.log("📦 Migration depuis database.json vers SQLite...");
  try {
    const raw = fs.readFileSync(JSON_PATH, "utf-8");
    const d = JSON.parse(raw);
    migrateFromJSON(d);
    console.log("✅ Migration réussie !");
  } catch (err) {
    console.error("❌ Erreur de migration:", err);
    seedDefaults();
  }
} else if (adminExists === 0) {
  seedDefaults();
}

// ─── Migration helper ─────────────────────────────────────────
function migrateFromJSON(d) {
  const run = db.transaction(() => {
    // Admin
    if (d.admin) {
      const pw = d.admin.password || hashPasswordSync("admin1234");
      db.prepare(`INSERT OR REPLACE INTO admin (id, nom, prenom, username, password, avatar)
                  VALUES (1, ?, ?, ?, ?, ?)`)
        .run(d.admin.nom || "Admin", d.admin.prenom || "Admin",
             d.admin.username || "admin", pw, d.admin.avatar || "🧑‍🏫");
    }

    // Settings
    if (d.settings) {
      for (const [k, v] of Object.entries(d.settings)) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
          .run(k, String(v));
      }
    }

    // Lang levels
    for (const ll of (d.langLevels || [])) {
      db.prepare("INSERT OR IGNORE INTO lang_levels (id, nom) VALUES (?, ?)").run(ll.id, ll.nom);
    }

    // Groups
    for (const sg of (d.groups || [])) {
      db.prepare(`INSERT OR REPLACE INTO groups (id, nom, categoryId, levelId, groupType, days, time, startDate, endDate, sessionsPerCycle, academicYearId)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(sg.id, sg.nom, sg.categoryId || null, sg.levelId || null,
             sg.groupType || "Normal", JSON.stringify(sg.days || []),
             sg.time || null, sg.startDate || null, sg.endDate || null,
             sg.sessionsPerCycle || 4, sg.academicYearId || null);
    }

    // Students
    for (const st of (d.students || [])) {
      const pw = st.password || hashPasswordSync("admin1234");
      const code = st.studentCode || `STU-${String(d.students.indexOf(st) + 1).padStart(3, '0')}`;
      db.prepare(`INSERT OR REPLACE INTO students (id, nom, prenom, phone, password, nfcCardId, enrollmentPaid, enrollmentDate, lastModified, createdAt, accountStatus, studentCode)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(st.id, st.nom, st.prenom, st.phone || null, pw,
             st.nfcCardId || "",
             st.enrollmentPaid ? 1 : 0, st.enrollmentDate || null,
             st.lastModified || null, st.createdAt || null,
             st.accountStatus || 'active', code);
    }

    // Enrollments
    for (const en of (d.enrollments || [])) {
      db.prepare(`INSERT OR REPLACE INTO enrollments (id, studentId, academicYearId, groupId, monthlyPrice)
                  VALUES (?, ?, ?, ?, ?)`)
        .run(en.id, en.studentId, en.academicYearId || null, en.groupId || null, en.monthlyPrice || 0);
    }

    // Sessions
    for (const s of (d.sessions || [])) {
      db.prepare(`INSERT OR REPLACE INTO sessions (id, groupId, academicYearId, date, time, status, note)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(s.id, s.groupId, s.academicYearId || null, s.date, s.time || "00:00", s.status || "planned", s.note || "");
    }

    // Attendances
    for (const a of (d.attendances || [])) {
      db.prepare(`INSERT OR REPLACE INTO attendances (id, sessionId, studentId, present, date, time, nfcVerified)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(a.id, a.sessionId || null, a.studentId, a.present ? 1 : 0,
             a.date || null, a.time || null, a.nfcVerified ? 1 : 0);
    }

    // Payments (stored as JSON blobs)
    for (const p of (d.payments || [])) {
      db.prepare("INSERT OR REPLACE INTO payments (id, data_json) VALUES (?, ?)").run(p.id, JSON.stringify(p));
    }

    // Parents
    for (const p of (d.parents || [])) {
      const pw = p.password || hashPasswordSync("000000");
      db.prepare(`INSERT OR REPLACE INTO parents (id, nom, telephone, password, data_json)
                  VALUES (?, ?, ?, ?, ?)`)
        .run(p.id, p.nom || "", p.telephone || null, pw, JSON.stringify({ ...p, password: undefined }));
    }

    // Extra sessions
    for (const es of (d.extraSessions || [])) {
      db.prepare("INSERT OR REPLACE INTO extra_sessions (id, data_json) VALUES (?, ?)").run(es.id, JSON.stringify(es));
    }

    // User notifications
    for (const n of (d.userNotifications || [])) {
      db.prepare(`INSERT OR REPLACE INTO user_notifications (id, userId, type, title, message, meta, date, time, read)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(n.id, n.userId, n.type || "info", n.title || "", n.message || "",
             JSON.stringify(n.meta || {}), n.date || null, n.time || null, n.read ? 1 : 0);
    }

    // Generic JSON blob tables
    const blobTables = [
      ["private_messages",  d.privateMessages],
      ["messages",          d.messages],
      ["notifications",     d.notifications],
      ["comm_groups",       d.commGroups],
      ["comm_messages",     d.commMessages],
      ["groups_table",      d.groups],
    ];
    for (const [table, arr] of blobTables) {
      for (const item of (arr || [])) {
        db.prepare(`INSERT OR REPLACE INTO ${table} (id, data_json) VALUES (?, ?)`)
          .run(item.id, JSON.stringify(item));
      }
    }

    // Comm categories
    for (const cat of (d.commCategories || [])) {
      db.prepare("INSERT OR IGNORE INTO comm_categories (id, nom) VALUES (?, ?)").run(cat.id, cat.nom);
    }
  });
  run();
}

// ─── Seed defaults if no JSON exists either ───────────────────
function seedDefaults() {
  const pw = hashPasswordSync("admin");
  db.transaction(() => {
    db.prepare(`INSERT OR IGNORE INTO admin (id, nom, prenom, username, password, avatar)
                VALUES (1, 'Bensalem', 'Karim', 'admin', ?, '🧑‍🏫')`).run(pw);
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('enrollmentFee', '500')").run();
    db.prepare("INSERT OR IGNORE INTO lang_levels (id, nom) VALUES ('ll1','A1'),('ll2','A2'),('ll3','B1'),('ll4','B2'),('ll5','C1'),('ll6','C2')").run();
    db.prepare("INSERT OR IGNORE INTO comm_categories (id, nom) VALUES ('cat1comm', 'Langue Française')").run();
  })();
}
