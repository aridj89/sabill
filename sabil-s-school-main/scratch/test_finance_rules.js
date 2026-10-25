import { getStudentFinancialSummary } from "../src/theme/tokens.js";

// Mock data matching user's scenario
const mockData = {
  settings: { enrollmentFee: 500 },
  academicYears: [{ id: "ay-1", name: "2025/2026", isCurrent: true }],
  groups: [{ id: "g-1", nom: "Groupe Math", monthlyPrice: 2500, sessionsPerCycle: 4 }],
  students: [
    { id: "st-A", nom: "A", prenom: "Student", groupId: "g-1", enrollmentPaid: true },
    { id: "st-B", nom: "B", prenom: "Student", groupId: "g-1", enrollmentPaid: false },
    { id: "st-C", nom: "C", prenom: "Student", groupId: "g-1", enrollmentPaid: false },
  ],
  enrollments: [
    { id: "en-A", studentId: "st-A", groupId: "g-1", academicYearId: "ay-1", monthlyPrice: 2500, registrationFeeAmount: 500 },
    { id: "en-B", studentId: "st-B", groupId: "g-1", academicYearId: "ay-1", monthlyPrice: 2500, registrationFeeAmount: 500 },
    { id: "en-C", studentId: "st-C", groupId: "g-1", academicYearId: "ay-1", monthlyPrice: 2500, registrationFeeAmount: 500 },
  ],
  sessions: [], // 0 done sessions => default 1 cycle = 2500 DA study_fee
  payments: [
    // Student A paid both (2500 course + 500 registration = 3000)
    { id: "p-A1", studentId: "st-A", academicYearId: "ay-1", type: "course", amount: 2500, paidAmount: 2500, paid: true },
    { id: "p-A2", studentId: "st-A", academicYearId: "ay-1", type: "registration", amount: 500, paidAmount: 500, paid: true },
    
    // Student B paid course fee only (2500)
    { id: "p-B1", studentId: "st-B", academicYearId: "ay-1", type: "course", amount: 2500, paidAmount: 2500, paid: true },

    // Student C paid nothing (0)
  ]
};

console.log("=== VERIFYING FINANCE RULES ===");

const finA = getStudentFinancialSummary(mockData, "st-A", "ay-1");
console.log("Student A (Paid All 3000):", {
  study_fee: finA.study_fee,
  registration_fee: finA.registration_fee,
  total_due: finA.total_due,
  amount_paid: finA.amount_paid,
  remaining_amount: finA.remaining_amount,
  payment_status: finA.payment_status
});

const finB = getStudentFinancialSummary(mockData, "st-B", "ay-1");
console.log("Student B (Paid Study 2500):", {
  study_fee: finB.study_fee,
  registration_fee: finB.registration_fee,
  total_due: finB.total_due,
  amount_paid: finB.amount_paid,
  remaining_amount: finB.remaining_amount,
  payment_status: finB.payment_status
});

const finC = getStudentFinancialSummary(mockData, "st-C", "ay-1");
console.log("Student C (Paid 0):", {
  study_fee: finC.study_fee,
  registration_fee: finC.registration_fee,
  total_due: finC.total_due,
  amount_paid: finC.amount_paid,
  remaining_amount: finC.remaining_amount,
  payment_status: finC.payment_status
});

const totalExpected = finA.total_due + finB.total_due + finC.total_due;
const totalCollected = finA.amount_paid + finB.amount_paid + finC.amount_paid;
const totalRemaining = finA.remaining_amount + finB.remaining_amount + finC.remaining_amount;

console.log("\n=== GLOBAL TOTALS ===");
console.log(`Total Attendu: ${totalExpected} DA (Expected 9000)`);
console.log(`Total Encaissé: ${totalCollected} DA (Expected 5500)`);
console.log(`Total Restant: ${totalRemaining} DA (Expected 3500)`);

if (totalExpected === 9000 && totalCollected === 5500 && totalRemaining === 3500) {
  console.log("\n✅ ALL TEST CASES PASSED PERFECTLY!");
} else {
  console.error("\n❌ Mismatch in global totals!");
  process.exit(1);
}
