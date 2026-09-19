import Database from "better-sqlite3";
import { randomBytes } from "crypto";
const db = new Database("server/school.db");

const uid = () => randomBytes(4).toString("hex");

console.log("Starting patch_enrollments...");

const years = db.prepare("SELECT * FROM academic_years ORDER BY id DESC").all();
let activeYearId = null;
if (years.length > 0) {
  const currentYear = years.find(y => y.isCurrent == 1 || String(y.isCurrent) === 'true') || years[0];
  activeYearId = currentYear.id;
}
console.log("Active Year ID:", activeYearId);
console.log("Active Year ID:", activeYearId);

const students = db.prepare("SELECT * FROM students").all();
console.log(`Found ${students.length} students.`);

const enrollments = db.prepare("SELECT * FROM enrollments").all();

let createdCount = 0;

const insertStmt = db.prepare(`
  INSERT INTO enrollments (id, studentId, academicYearId, groupId, monthlyPrice)
  VALUES (?, ?, ?, ?, ?)
`);

db.transaction(() => {
  for (const st of students) {
    // Some legacy versions used groupId, some subgroupId, check both
    const legacyGroupId = st.groupId || st.subgroupId;
    
    if (legacyGroupId) {
      // Check if enrollment already exists for this year
      const hasEnrollment = enrollments.some(e => e.studentId === st.id && e.academicYearId === activeYearId);
      
      if (!hasEnrollment) {
        // Price might be on student.monthlyPrice or montant (if JSON)
        const price = st.monthlyPrice || st.montant || 0;
        insertStmt.run(uid(), st.id, activeYearId, legacyGroupId, price);
        createdCount++;
      }
    }
  }
})();

console.log(`Created ${createdCount} new enrollments from legacy student group IDs.`);
