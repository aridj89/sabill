import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../server/school.db");
const JSON_PATH_SERVER = path.join(__dirname, "../server/database.json");
const JSON_PATH_ROOT = path.join(__dirname, "../database.json");

// Remove any lingering json files
[JSON_PATH_SERVER, JSON_PATH_ROOT].forEach(file => {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`🗑️ Deleted JSON file: ${file}`);
    } catch (e) {
      console.warn(`Could not delete ${file}:`, e.message);
    }
  }
});

if (!fs.existsSync(DB_PATH)) {
  console.error("❌ school.db not found at:", DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("foreign_keys = OFF"); // Disable temporarily for clean sweep

console.log("🧹 Starting full database purge for production deployment...");

try {
  db.transaction(() => {
    const tablesToWipe = [
      "students",
      "enrollments",
      "sessions",
      "attendances",
      "payments",
      "parents",
      "extra_sessions",
      "debt_carry_overs",
      "notifications",
      "messages",
      "user_notifications",
      "comm_groups",
      "comm_messages",
      "private_messages",
      "groups",
      "groups_table",
      "academic_years",
      "subgroups",
      "subgroup_messages"
    ];

    for (const table of tablesToWipe) {
      try {
        db.prepare(`DELETE FROM "${table}"`).run();
        console.log(`- Truncated table: ${table}`);
      } catch (err) {
        if (!err.message.includes("no such table")) {
          throw err;
        }
      }
    }

    // Drop legacy tables that are no longer used
    const legacyTables = ["subgroups", "subgroup_messages"];
    for (const legacy of legacyTables) {
      try {
        db.prepare(`DROP TABLE IF EXISTS "${legacy}"`).run();
        console.log(`- Dropped legacy table: ${legacy}`);
      } catch (e) {}
    }

    // Ensure default settings & language levels are clean
    db.prepare("DELETE FROM settings").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('enrollmentFee', '500')").run();

    db.prepare("DELETE FROM lang_levels").run();
    db.prepare("INSERT INTO lang_levels (id, nom) VALUES ('ll1','A1'),('ll2','A2'),('ll3','B1'),('ll4','B2'),('ll5','C1'),('ll6','C2')").run();

    db.prepare("DELETE FROM comm_categories").run();
    db.prepare("INSERT INTO comm_categories (id, nom) VALUES ('cat1comm', 'Langue Française')").run();
  })();
  
  db.pragma("foreign_keys = ON");
  db.exec("VACUUM"); // Reclaim disk space
  
  console.log("✅ Database and JSON completely cleaned!");
  console.log("ℹ️ Preserved schema and essential bootstrap config: admin, settings, lang_levels (A1-C2), comm_categories.");

} catch (err) {
  console.error("❌ Failed to clean database:", err);
  process.exit(1);
}
