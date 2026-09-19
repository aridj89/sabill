import Database from "better-sqlite3";
const db = new Database("server/school.db");
const tables = ['academic_years', 'groups', 'students', 'enrollments'];
for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM ${t}`).get().c;
  console.log(`${t} count:`, count);
}
