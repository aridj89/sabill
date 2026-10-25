import { db } from "../server/db.js";
import { loadDatabase } from "../server/dbHelpers.js";

console.log("--- TABLE ACADEMIC_YEARS ---");
const rows = db.prepare("SELECT * FROM academic_years").all();
console.log("academic_years table rows:", rows);

console.log("--- LOAD DATABASE ACADEMIC YEARS ---");
const data = loadDatabase();
console.log("data.academicYears:", data.academicYears);
console.log("data.settings:", data.settings);
console.log("data.students length:", data.students?.length);
