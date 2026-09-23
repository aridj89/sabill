import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPasswordSync } from "./utils/password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPath = fs.existsSync(path.join(__dirname, "school.db"))
  ? path.join(__dirname, "school.db")
  : (process.env.DATABASE_PATH || "./database.sqlite");
const dbPath = process.env.DATABASE_PATH || defaultPath;

// Ensure directory exists if path contains subdirectories (e.g. /data/database.sqlite on Railway)
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== "." && !fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.warn("Could not create db directory:", err.message);
  }
}

export const db = new Database(dbPath);
export const DB_PATH = dbPath;
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
  // Auto-seed academic years if empty
  const yearCount = db.prepare("SELECT COUNT(*) as count FROM academic_years").get().count;
  if (yearCount === 0) {
    const insertYear = db.prepare("INSERT INTO academic_years (id, name, isCurrent) VALUES (?, ?, ?)");
    insertYear.run("ay_2526", "2025_2026", 1);
    insertYear.run("ay_2627", "2026_2027", 0);
    insertYear.run("ay_2728", "2027_2028", 0);
  }

  const sessionCols = db.prepare("PRAGMA table_info(sessions)").all().map(c => c.name);
  if (!sessionCols.includes("groupId")) {
    db.exec("ALTER TABLE sessions ADD COLUMN groupId TEXT;");
  }
  if (!sessionCols.includes("subgroupId")) {
    db.exec("ALTER TABLE sessions ADD COLUMN subgroupId TEXT;");
  }
  if (!sessionCols.includes("academicYearId")) {
    db.exec("ALTER TABLE sessions ADD COLUMN academicYearId TEXT;");
  }
  // Sync groupId and subgroupId values if one is null
  db.exec("UPDATE sessions SET groupId = subgroupId WHERE (groupId IS NULL OR groupId = '') AND subgroupId IS NOT NULL;");
  db.exec("UPDATE sessions SET subgroupId = groupId WHERE (subgroupId IS NULL OR subgroupId = '') AND groupId IS NOT NULL;");
} catch (e) {
  console.warn("Migration warning:", e.message);
}

// ─── Ensure default admin & initial settings if empty database ──────
// Only runs if the admin table is completely empty (no fake/seed data, no reset on startup)
const adminExists = db.prepare("SELECT COUNT(*) as c FROM admin").get().c;
if (adminExists === 0) {
  seedDefaults();
}

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
