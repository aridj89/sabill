import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../server/school.db");

const db = new Database(DB_PATH);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c;
  console.log(`${t.name}: ${count}`);
  if (count > 0 && count <= 25) {
    const rows = db.prepare(`SELECT * FROM "${t.name}" LIMIT 5`).all();
    console.log(JSON.stringify(rows, null, 2));
  }
}
