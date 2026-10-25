import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "server", "school.db");

console.log("=== FINAL DATABASE REPORT ===");
console.log("DATABASE PATH:", path.resolve(dbPath));

const sqlite = new Database(dbPath, { readonly: true });
const academicYearsCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM academic_years").get().cnt;
const studentsCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM students").get().cnt;
const paymentsCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM payments").get().cnt;
const enrollmentsCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM enrollments").get().cnt;
const debtCarryOversCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM debt_carry_overs").get().cnt;

console.log("ACADEMIC YEARS COUNT:", academicYearsCount);
console.log("STUDENTS COUNT:", studentsCount);
console.log("PAYMENTS COUNT:", paymentsCount);
console.log("FINANCIAL RECORDS COUNT:", enrollmentsCount + debtCarryOversCount);
console.log("=============================");
sqlite.close();
