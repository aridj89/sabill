// scratch/test_financial_screen_render.js
import { loadDatabase } from "../server/dbHelpers.js";
import { getStudentFinancialSummary } from "../src/theme/tokens.js";

console.log("==========================================");
console.log("🔍 DIAGNOSING FINANCIAL ENGINE & DATA WITH REAL DB");
console.log("==========================================");

let data;
try {
  data = loadDatabase();
  console.log("✅ Database loaded successfully from school.db");
} catch (err) {
  console.error("❌ Failed to load database:", err.message);
  process.exit(1);
}

console.log("[FINANCE DEBUG] data keys =", Object.keys(data || {}));
console.log("[FINANCE DEBUG] activeYearId =", data?.activeYearId);
console.log("[FINANCE DEBUG] students count =", data?.students?.length);
console.log("[FINANCE DEBUG] groups count =", data?.groups?.length);
console.log("[FINANCE DEBUG] enrollments count =", data?.enrollments?.length);
console.log("[FINANCE DEBUG] payments count =", data?.payments?.length);
console.log("[FINANCE DEBUG] academicYears count =", data?.academicYears?.length);
console.log("[FINANCE DEBUG] settings =", data?.settings);
console.log("[FINANCE DEBUG] sample payment =", data?.payments?.[0]);
console.log("[FINANCE DEBUG] sample enrollment =", data?.enrollments?.[0]);

const selectedYearId = data?.activeYearId || (data?.academicYears?.find(y => y.isCurrent)?.id) || (data?.academicYears?.[0]?.id) || "2025-2026";
console.log("[FINANCE DEBUG] selectedYearId =", selectedYearId);

console.log("\n--- TESTING STUDENT SUMMARY CALCULATION ---");
let calcSuccess = 0;
let calcFail = 0;

(data?.students || []).forEach(st => {
  try {
    const summary = getStudentFinancialSummary(data, st.id, selectedYearId);
    calcSuccess++;
  } catch (err) {
    console.error(`❌ Error calculating summary for student ${st.id} (${st.prenom} ${st.nom}):`, err.stack);
    calcFail++;
  }
});

console.log(`Financial summary calculations: ${calcSuccess} succeeded, ${calcFail} failed.`);

console.log("\n--- TESTING MONTHLY STATS AGGREGATION ---");
const MONTHS_KEYS = [
  { key: "09", fr: "Septembre", ar: "سبتمبر" },
  { key: "10", fr: "Octobre", ar: "أكتوبر" },
  { key: "11", fr: "Novembre", ar: "نوفمبر" },
  { key: "12", fr: "Décembre", ar: "ديسمبر" },
  { key: "01", fr: "Janvier", ar: "جانفي" },
  { key: "02", fr: "Février", ar: "فيفري" },
  { key: "03", fr: "Mars", ar: "مارس" },
  { key: "04", fr: "Avril", ar: "أفريل" },
  { key: "05", fr: "Mai", ar: "ماي" },
  { key: "06", fr: "Juin", ar: "جوان" },
  { key: "07", fr: "Juillet", ar: "جويلية" },
  { key: "08", fr: "Août", ar: "أوت" },
];

const payments = (data?.payments || []).filter(p => p.academicYearId === selectedYearId || !p.academicYearId);
let monthSuccess = true;

try {
  const monthlyStats = MONTHS_KEYS.map(m => {
    const monthPayments = payments.filter(p => {
      const pDate = p?.paidDate || p?.date || "";
      return typeof pDate === "string" && pDate.includes(`-${m.key}-`);
    });

    const received = monthPayments.reduce((acc, p) => acc + (Number(p.paidAmount || p.amount) || 0), 0);
    return {
      key: m.key,
      name: m.fr,
      received,
      count: monthPayments.length,
    };
  });
  console.log("✅ Monthly stats aggregated successfully. Total months:", monthlyStats.length);
} catch (err) {
  console.error("❌ Monthly stats aggregation failed:", err.stack);
  monthSuccess = false;
}

console.log("\n==========================================");
console.log("DIAGNOSTIC TEST COMPLETE");
console.log("==========================================");
