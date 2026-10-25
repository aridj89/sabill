import { getStudentFinancialSummary } from "../src/theme/tokens.js";

async function runTest() {
  try {
    const res = await fetch("https://sabill-production-63fa.up.railway.app/api/data");
    const data = await res.json();
    console.log("Fetched Railway Data successfully!");
    console.log("Students count:", data.students?.length);
    console.log("Payments count:", data.payments?.length);
    console.log("Enrollments count:", data.enrollments?.length);
    console.log("Groups count:", data.groups?.length);
    console.log("AcademicYears count:", data.academicYears?.length);

    const academicYears = Array.isArray(data?.academicYears) && data.academicYears.length > 0
      ? data.academicYears
      : [{ id: "ay-2025-2026", name: "2025/2026", isCurrent: true }];

    const selectedYearId = academicYears[0].id;
    console.log("Selected Year ID:", selectedYearId);

    const students = Array.isArray(data?.students) ? data.students : [];
    
    let successCount = 0;
    for (const st of students) {
      if (!st || !st.id) continue;
      const summary = getStudentFinancialSummary(data, st.id, selectedYearId);
      successCount++;
    }
    console.log(`Successfully calculated summaries for ${successCount} students!`);
  } catch (err) {
    console.error("CRASH detected in calculations:", err);
  }
}

runTest();
