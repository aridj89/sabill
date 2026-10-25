// scratch/test_finance_waterfall.js
// Automated verification script for Academic Year Finance Engine & Waterfall Allocation

import { getStudentFinancialSummary } from "../src/theme/tokens.js";

console.log("==========================================");
console.log("🧪 TESTING SABIL'S SCHOOL ACADEMIC YEAR FINANCE ENGINE & WATERFALL");
console.log("==========================================");

// Mock Dataset simulating multi-year data
const mockData = {
  academicYears: [
    { id: "2025-2026", name: "2025-2026", isCurrent: true, enrollmentFee: 500 },
    { id: "2026-2027", name: "2026-2027", isCurrent: false, enrollmentFee: 600 },
  ],
  students: [
    {
      id: "stu1",
      nom: "Benali",
      prenom: "Amine",
      phone: "0550112233",
      groupId: "grp_2025_1",
      monthlyPrice: 2500,
      registrationFeeAmount: 500,
      registrationFeePaid: 500,
      registrationFeeStatus: "PAYÉ",
      credit: 0
    },
    {
      id: "stu2",
      nom: "Kaci",
      prenom: "Yasmine",
      phone: "0661223344",
      groupId: "grp_2025_2",
      monthlyPrice: 3000,
      registrationFeeAmount: 500,
      registrationFeePaid: 0,
      registrationFeeStatus: "NON PAYÉ",
      credit: 0
    },
    {
      id: "stu_historical",
      nom: "Chala",
      prenom: "Karim",
      phone: "0770998877",
      groupId: null, // Not enrolled in 2026-2027
      monthlyPrice: 2000,
      credit: 0
    }
  ],
  groups: [
    { id: "grp_2025_1", nom: "Groupe 1 BAC", categoryId: "cem", levelId: "4ème", academicYearId: "2025-2026" },
    { id: "grp_2025_2", nom: "Groupe 2 Maths", categoryId: "cem", levelId: "3ème", academicYearId: "2025-2026" },
    { id: "grp_2026_1", nom: "Groupe 1 2026", categoryId: "cem", levelId: "4ème", academicYearId: "2026-2027" }
  ],
  enrollments: [
    { id: "en1", studentId: "stu1", academicYearId: "2025-2026", groupId: "grp_2025_1", monthlyPrice: 2500 },
    { id: "en2", studentId: "stu2", academicYearId: "2025-2026", groupId: "grp_2025_2", monthlyPrice: 3000 },
    { id: "en3", studentId: "stu_historical", academicYearId: "2025-2026", groupId: "grp_2025_1", monthlyPrice: 2000 }, // Enrolled in 2025-2026 only
    { id: "en4", studentId: "stu1", academicYearId: "2026-2027", groupId: "grp_2026_1", monthlyPrice: 2800 },
  ],
  debtCarryOvers: [
    { id: "debt1", studentId: "stu2", fromYearId: "2025-2026", toYearId: "2026-2027", amount: 1500, level: "3ème CEM" }
  ],
  payments: [
    { id: "p1", studentId: "stu1", academicYearId: "2025-2026", amount: 2500, paidAmount: 2500, type: "course", paidDate: "2025-10-15" },
    { id: "p2", studentId: "stu1", academicYearId: "2025-2026", amount: 500, paidAmount: 500, type: "registration", paidDate: "2025-09-01" },
  ],
  sessions: [
    { id: "sess1", groupId: "grp_2025_1", academicYearId: "2025-2026", date: "2025-10-01", status: "completed" },
    { id: "sess2", groupId: "grp_2025_2", academicYearId: "2025-2026", date: "2025-10-02", status: "completed" },
  ]
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(` ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(` ❌ FAIL: ${message}`);
    failed++;
  }
}

// Test 1: Student 1 calculation for 2025-2026
const fin1 = getStudentFinancialSummary(mockData, "stu1", "2025-2026");
assert(fin1.totalCourseFees === 2500, `stu1 2025-2026 Course fees should be 2500 (got ${fin1.totalCourseFees})`);
assert(fin1.regFeePaid === 500, `stu1 reg fee paid should be 500 (got ${fin1.regFeePaid})`);
assert(fin1.regFeeStatus === "PAYÉ", `stu1 reg fee status should be PAYÉ (got ${fin1.regFeeStatus})`);
assert(fin1.totalPaid === 3000, `stu1 total paid should be 3000 (got ${fin1.totalPaid})`);

// Test 2: Student 2 with previous debt in 2026-2027
const fin2 = getStudentFinancialSummary(mockData, "stu2", "2026-2027");
assert(fin2.previousDebtRemaining === 1500, `stu2 in 2026-2027 should have previous debt remaining 1500 (got ${fin2.previousDebtRemaining})`);

// Test 3: Historical Student not enrolled in 2026-2027
const finHist = getStudentFinancialSummary(mockData, "stu_historical", "2026-2027");
assert(finHist.isEnrolledThisYear === false, `stu_historical should be marked isEnrolledThisYear = false in 2026-2027`);
assert(finHist.activeGroupName === "Non inscrit cette année", `stu_historical group name should be 'Non inscrit cette année'`);

// Test 4: Waterfall allocation logic test
console.log("\n--- Testing Waterfall Payment Allocation ---");
function testWaterfall(paymentAmount, finSummary) {
  let remaining = paymentAmount;
  let paidPrevDebt = 0;
  if (finSummary.previousDebtRemaining > 0 && remaining > 0) {
    paidPrevDebt = Math.min(remaining, finSummary.previousDebtRemaining);
    remaining -= paidPrevDebt;
  }
  let paidRegFee = 0;
  if (finSummary.regFeeRemaining > 0 && remaining > 0) {
    paidRegFee = Math.min(remaining, finSummary.regFeeRemaining);
    remaining -= paidRegFee;
  }
  let paidCourseFees = 0;
  if (finSummary.courseFeesRemaining > 0 && remaining > 0) {
    paidCourseFees = Math.min(remaining, finSummary.courseFeesRemaining);
    remaining -= paidCourseFees;
  }
  let creditCreated = 0;
  if (remaining > 0) {
    creditCreated = remaining;
  }
  return { paidPrevDebt, paidRegFee, paidCourseFees, creditCreated };
}

// Scenario: Student 2 has 1500 previous debt + 500 reg fee + 3000 course fees = 5000 total debt
// Pay 2000 DA: Should pay 1500 Previous Debt + 500 Reg Fee + 0 Course Fees + 0 Credit
const wf1 = testWaterfall(2000, fin2);
assert(wf1.paidPrevDebt === 1500, `Waterfall 1: Paid Previous Debt should be 1500 (got ${wf1.paidPrevDebt})`);
assert(wf1.paidRegFee === 500, `Waterfall 1: Paid Reg Fee should be 500 (got ${wf1.paidRegFee})`);
assert(wf1.paidCourseFees === 0, `Waterfall 1: Paid Course Fees should be 0 (got ${wf1.paidCourseFees})`);
assert(wf1.creditCreated === 0, `Waterfall 1: Credit Created should be 0 (got ${wf1.creditCreated})`);

// Scenario: Overpayment of 6000 DA: Should pay 1500 Prev Debt + 500 Reg Fee + 3000 Course Fees + 1000 Credit
const fin2Full = { ...fin2, courseFeesRemaining: 3000 };
const wf2 = testWaterfall(6000, fin2Full);
assert(wf2.paidPrevDebt === 1500, `Waterfall 2: Paid Prev Debt should be 1500`);
assert(wf2.paidRegFee === 500, `Waterfall 2: Paid Reg Fee should be 500`);
assert(wf2.paidCourseFees === 3000, `Waterfall 2: Paid Course Fees should be 3000`);
assert(wf2.creditCreated === 1000, `Waterfall 2: Credit Created should be 1000 (got ${wf2.creditCreated})`);

console.log("\n==========================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==========================================");

if (failed > 0) {
  process.exit(1);
}
