import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, "..", "server");

console.log("Checking DB_PATH env:", process.env.DB_PATH || "Not set (defaults to server/school.db)");

// Inspect server/database.json
const jsonPath = path.join(serverDir, "database.json");
if (fs.existsSync(jsonPath)) {
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    console.log("\n--- SERVER/DATABASE.JSON ---");
    console.log("academicYears:", parsed.academicYears?.length || 0, parsed.academicYears || []);
    console.log("students:", parsed.students?.length || 0);
    console.log("payments:", parsed.payments?.length || 0);
    console.log("enrollments:", parsed.enrollments?.length || 0);
    console.log("debtCarryOvers:", parsed.debtCarryOvers?.length || 0);
  } catch (err) {
    console.error("Error reading database.json:", err.message);
  }
}

// Inspect database-backup.json
const backupJsonPath = path.join(serverDir, "database-backup.json");
if (fs.existsSync(backupJsonPath)) {
  try {
    const raw = fs.readFileSync(backupJsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    console.log("\n--- SERVER/DATABASE-BACKUP.JSON ---");
    console.log("academicYears:", parsed.academicYears?.length || 0, parsed.academicYears || []);
    console.log("students:", parsed.students?.length || 0);
    console.log("payments:", parsed.payments?.length || 0);
    console.log("enrollments:", parsed.enrollments?.length || 0);
    console.log("debtCarryOvers:", parsed.debtCarryOvers?.length || 0);
  } catch (err) {
    console.error("Error reading database-backup.json:", err.message);
  }
}

// Inspect server/school.db
const schoolDbPath = path.join(serverDir, "school.db");
inspectSqlite(schoolDbPath, "SERVER/SCHOOL.DB");

// Inspect backups
const backupDir = path.join(serverDir, "backups");
if (fs.existsSync(backupDir)) {
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".db"));
  for (const f of files) {
    inspectSqlite(path.join(backupDir, f), `BACKUP: ${f}`);
  }
}

function inspectSqlite(dbPath, label) {
  if (!fs.existsSync(dbPath)) return;
  console.log(`\n--- ${label} (${dbPath}) ---`);
  try {
    const sqlite = new Database(dbPath, { readonly: true });
    
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log("Tables present:", tables.join(", "));

    if (tables.includes("academic_years")) {
      const years = sqlite.prepare("SELECT * FROM academic_years").all();
      console.log(`academic_years (${years.length}):`, years);
    }
    if (tables.includes("students")) {
      const c = sqlite.prepare("SELECT COUNT(*) as cnt FROM students").get().cnt;
      console.log(`students count: ${c}`);
    }
    if (tables.includes("payments")) {
      const c = sqlite.prepare("SELECT COUNT(*) as cnt FROM payments").get().cnt;
      console.log(`payments count: ${c}`);
    }
    if (tables.includes("enrollments")) {
      const c = sqlite.prepare("SELECT COUNT(*) as cnt FROM enrollments").get().cnt;
      console.log(`enrollments count: ${c}`);
    }
    if (tables.includes("debt_carry_overs")) {
      const c = sqlite.prepare("SELECT COUNT(*) as cnt FROM debt_carry_overs").get().cnt;
      console.log(`debt_carry_overs count: ${c}`);
    }
    sqlite.close();
  } catch (err) {
    console.error(`Error reading ${label}:`, err.message);
  }
}
