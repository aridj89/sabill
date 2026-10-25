import { loadDatabase } from "../server/dbHelpers.js";
import { getStudentFinancialSummary } from "../src/theme/tokens.js";

try {
  console.log("Loading database...");
  const dbData = loadDatabase();
  console.log("Database loaded successfully!");
  console.log("Students count:", dbData.students?.length);
  console.log("Enrollments count:", dbData.enrollments?.length);
  console.log("AcademicYears:", dbData.academicYears);
  console.log("Payments count:", dbData.payments?.length);

  const academicYears = Array.isArray(dbData.academicYears) && dbData.academicYears.length > 0
    ? dbData.academicYears
    : [{ id: "2025-2026", name: "2025-2026" }];

  for (const year of academicYears) {
    console.log(`\nTesting year: ${year.id} (${year.name})`);
    for (const student of (dbData.students || [])) {
      try {
        const summary = getStudentFinancialSummary(dbData, student.id, year.id);
        if (!summary) {
          console.error(`❌ Null summary returned for student ${student.id} in year ${year.id}`);
        }
      } catch (err) {
        console.error(`❌ CRASH calculating student ${student.id} (${student.prenom} ${student.nom}) in year ${year.id}:`, err);
      }
    }
  }

  console.log("\nAll student summaries processed successfully!");
} catch (err) {
  console.error("❌ Fatal error loading db or testing finance:", err);
}
