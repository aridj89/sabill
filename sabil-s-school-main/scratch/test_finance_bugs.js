import assert from "assert";
import { getStudentFinancialSummary } from "../src/theme/tokens.js";

console.log("=== RUNNING FINANCE BUGS AUTOMATED TEST SUITE ===");

// Common mock data setup helper
function createInitialData() {
  return {
    academicYears: [
      { id: "year-2025", name: "2025-2026", isCurrent: false },
      { id: "year-2026", name: "2026-2027", isCurrent: true },
    ],
    activeYearId: "year-2025",
    groups: [
      { id: "group-1", nom: "Maths 1", price: 2500, sessionsPerCycle: 4 }
    ],
    sessions: [
      { id: "sess-1", groupId: "group-1", academicYearId: "year-2025", status: "done" },
      { id: "sess-2", groupId: "group-1", academicYearId: "year-2025", status: "done" },
      { id: "sess-3", groupId: "group-1", academicYearId: "year-2025", status: "done" },
      { id: "sess-4", groupId: "group-1", academicYearId: "year-2025", status: "done" },
    ],
    students: [
      { id: "st-1", nom: "Benali", prenom: "Sami", monthlyPrice: 2500, montant: 2500 }
    ],
    enrollments: [
      { id: "en-2025", studentId: "st-1", academicYearId: "year-2025", groupId: "group-1", monthlyPrice: 2500, registrationFeeAmount: 500, registrationFeePaid: 500, registrationFeeStatus: "PAYÉ" }
    ],
    payments: []
  };
}

// ---------------------------------------------------------------
// TEST 1 & TEST 6: Changing current student price must not change 2025-2026 calculations
// ---------------------------------------------------------------
{
  const data = createInitialData();
  // Add payment of 2500 for year 2025-2026
  data.payments.push({
    id: "pmt-1",
    studentId: "st-1",
    academicYearId: "year-2025",
    amount: 2500,
    expectedAmount: 2500,
    paidAmount: 2500,
    status: "paid",
    paid: true
  });

  // Calculate 2025-2026 before price change
  const finBefore = getStudentFinancialSummary(data, "st-1", "year-2025");
  assert.strictEqual(finBefore.currentFees, 2500, "Test 1 failed: Initial 2025-2026 course fee should be 2500");
  assert.strictEqual(finBefore.totalPaid, 2500, "Test 1 failed: Total paid from payments should be 2500");
  assert.strictEqual(finBefore.currentFeesRemaining, 0, "Test 1 failed: 2025-2026 remaining should be 0");
  assert.strictEqual(finBefore.totalUnpaid, 0, "Test 1 failed: 2025-2026 total unpaid should be 0");

  // Administrator changes student current price to 3000
  data.students[0].monthlyPrice = 3000;
  data.students[0].montant = 3000;

  // Calculate 2025-2026 after global price change
  const finAfter = getStudentFinancialSummary(data, "st-1", "year-2025");
  assert.strictEqual(finAfter.currentFees, 2500, "Test 1/6 failed: 2025-2026 course fee must STAY 2500 after price change");
  assert.strictEqual(finAfter.currentFeesRemaining, 0, "Test 1/6 failed: 2025-2026 remaining must STAY 0");
  assert.strictEqual(finAfter.totalUnpaid, 0, "Test 1/6 failed: No historical debt should be created!");
  console.log("✔ TEST 1 & TEST 6 PASSED: Price change does not alter 2025-2026 history.");
}

// ---------------------------------------------------------------
// TEST 2: Academic year price isolation (2025-2026 = 2500, 2026-2027 = 3000 -> 3500)
// ---------------------------------------------------------------
{
  const data = createInitialData();
  data.enrollments.push({
    id: "en-2026",
    studentId: "st-1",
    academicYearId: "year-2026",
    groupId: "group-1",
    monthlyPrice: 3000,
    registrationFeeAmount: 500
  });
  data.sessions.push(
    { id: "sess-21", groupId: "group-1", academicYearId: "year-2026", status: "done" },
    { id: "sess-22", groupId: "group-1", academicYearId: "year-2026", status: "done" },
    { id: "sess-23", groupId: "group-1", academicYearId: "year-2026", status: "done" },
    { id: "sess-24", groupId: "group-1", academicYearId: "year-2026", status: "done" }
  );

  // Change 2026-2027 price to 3500
  const en2026 = data.enrollments.find(e => e.academicYearId === "year-2026");
  en2026.monthlyPrice = 3500;

  const fin2025 = getStudentFinancialSummary(data, "st-1", "year-2025");
  const fin2026 = getStudentFinancialSummary(data, "st-1", "year-2026");

  assert.strictEqual(fin2025.currentFees, 2500, "Test 2 failed: 2025-2026 fee must remain 2500");
  assert.strictEqual(fin2026.currentFees, 3500, "Test 2 failed: 2026-2027 fee must be 3500");
  console.log("✔ TEST 2 PASSED: Academic year prices are strictly isolated.");
}

// ---------------------------------------------------------------
// TEST 3: Registration Fee = 500, Student pays 500 -> Status = PAYÉ
// ---------------------------------------------------------------
{
  const data = {
    academicYears: [{ id: "y1", isCurrent: true }],
    groups: [],
    sessions: [],
    students: [{ id: "st-1", monthlyPrice: 2000 }],
    enrollments: [{ id: "e1", studentId: "st-1", academicYearId: "y1", registrationFeeAmount: 500 }],
    payments: [{ id: "p1", studentId: "st-1", academicYearId: "y1", amount: 500, expectedAmount: 500, paidAmount: 500, status: "paid", paid: true }]
  };

  const fin = getStudentFinancialSummary(data, "st-1", "y1");
  assert.strictEqual(fin.registrationFeePaid, 500, "Test 3 failed: reg fee paid should be 500");
  assert.strictEqual(fin.registrationFeeRemaining, 0, "Test 3 failed: reg fee remaining should be 0");
  assert.strictEqual(fin.registrationFeeStatus, "PAYÉ", "Test 3 failed: reg fee status should be PAYÉ");
  console.log("✔ TEST 3 PASSED: Registration fee = 500 paid -> PAYÉ.");
}

// ---------------------------------------------------------------
// TEST 4: Registration Fee = 500, Student pays 200 -> PARTIELLEMENT PAYÉ, Remaining = 300
// ---------------------------------------------------------------
{
  const data = {
    academicYears: [{ id: "y1", isCurrent: true }],
    groups: [],
    sessions: [],
    students: [{ id: "st-1", monthlyPrice: 2000 }],
    enrollments: [{ id: "e1", studentId: "st-1", academicYearId: "y1", registrationFeeAmount: 500 }],
    payments: [{ id: "p1", studentId: "st-1", academicYearId: "y1", amount: 200, expectedAmount: 200, paidAmount: 200, status: "partial", paid: false }]
  };

  const fin = getStudentFinancialSummary(data, "st-1", "y1");
  assert.strictEqual(fin.registrationFeePaid, 200, "Test 4 failed: reg fee paid should be 200");
  assert.strictEqual(fin.registrationFeeRemaining, 300, "Test 4 failed: reg fee remaining should be 300");
  assert.strictEqual(fin.registrationFeeStatus, "PARTIELLEMENT PAYÉ", "Test 4 failed: status should be PARTIELLEMENT PAYÉ");
  console.log("✔ TEST 4 PASSED: Registration fee = 200/500 -> PARTIELLEMENT PAYÉ, remaining 300.");
}

// ---------------------------------------------------------------
// TEST 5: Registration Fee = 500, Student pays 700 -> PAYÉ, extra 200 follows waterfall
// ---------------------------------------------------------------
{
  const data = {
    academicYears: [{ id: "y1", isCurrent: true }],
    groups: [{ id: "g1", price: 2000, sessionsPerCycle: 4 }],
    sessions: [
      { id: "s1", groupId: "g1", academicYearId: "y1", status: "done" }
    ],
    students: [{ id: "st-1", monthlyPrice: 2000 }],
    enrollments: [{ id: "e1", studentId: "st-1", academicYearId: "y1", groupId: "g1", monthlyPrice: 2000, registrationFeeAmount: 500 }],
    payments: [{ id: "p1", studentId: "st-1", academicYearId: "y1", amount: 700, expectedAmount: 700, paidAmount: 700, status: "partial", paid: false }]
  };

  const fin = getStudentFinancialSummary(data, "st-1", "y1");
  assert.strictEqual(fin.registrationFeePaid, 500, "Test 5 failed: reg fee paid should be 500");
  assert.strictEqual(fin.registrationFeeRemaining, 0, "Test 5 failed: reg fee remaining should be 0");
  assert.strictEqual(fin.registrationFeeStatus, "PAYÉ", "Test 5 failed: status should be PAYÉ");
  assert.strictEqual(fin.currentFeesPaid, 200, "Test 5 failed: extra 200 must follow waterfall to course fees");
  console.log("✔ TEST 5 PASSED: Registration fee = 700 -> PAYÉ + 200 allocated to course fees.");
}

console.log("=== ALL 6 FINANCIAL TESTS PASSED SUCCESSFULLY! ===");
