import { BookOpen, School, Landmark, Languages, Video } from "lucide-react";

/* ---------------------------------------------------------------
   DESIGN TOKENS (Glassmorphism & Brown Theme)
--------------------------------------------------------------- */
export const C = {
  bg: "transparent",
  surface: "linear-gradient(160deg, rgba(22,18,71,0.88) 0%, rgba(71,48,18,0.82) 55%, rgba(18,68,71,0.88) 100%)",
  border: "rgba(255,255,255,0.22)",
  ink: "#FFFFFF",
  inkSoft: "rgba(255,255,255,0.62)",
  accent: "#E2963A",
  accentSoft: "rgba(226,150,58,0.2)",
  good: "#4ade80",
  goodSoft: "rgba(74,222,128,0.2)",
  bad: "#f87171",
  badSoft: "rgba(248,113,113,0.2)",
  warn: "#fbbf24",
  warnSoft: "rgba(251,191,36,0.2)",
  navy: "linear-gradient(135deg, #161247, #473012, #124447)",
  navySoft: "rgba(226,150,58,0.13)",
  glassStyle: {
    background: "linear-gradient(160deg, rgba(22,18,71,0.88) 0%, rgba(71,48,18,0.82) 55%, rgba(18,68,71,0.88) 100%)",
    backdropFilter: "blur(20px) saturate(1.4)",
    WebkitBackdropFilter: "blur(20px) saturate(1.4)",
    border: "1px solid rgba(255,255,255,0.22)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
};

/* ---------------------------------------------------------------
   SCHOOL STRUCTURE — Catégories statiques
--------------------------------------------------------------- */
export const SCHOOL_CATS = [
  {
    id: "primaire",
    label: "Primaire",
    labelAr: "ابتدائي",
    icon: BookOpen,
    color: "#818cf8",
    bg: "rgba(99,102,241,0.2)",
    border: "rgba(99,102,241,0.45)",
    levels: ["4ème", "5ème"],
  },
  {
    id: "cem",
    label: "CEM",
    labelAr: "متوسط",
    icon: School,
    color: "#4ade80",
    bg: "rgba(34,197,94,0.18)",
    border: "rgba(34,197,94,0.42)",
    levels: ["1ère", "2ème", "3ème", "4ème"],
  },
  {
    id: "lycee",
    label: "Lycée",
    labelAr: "ثانوي",
    icon: Landmark,
    color: "#f472b6",
    bg: "rgba(236,72,153,0.18)",
    border: "rgba(236,72,153,0.42)",
    levels: ["1ère", "2ème", "3ème"],
  },
  {
    id: "langues",
    label: "Langues",
    labelAr: "اللغات",
    icon: Languages,
    color: "#E2963A",
    bg: "rgba(226,150,58,0.2)",
    border: "rgba(226,150,58,0.45)",
    levels: null,  // dynamique — stocké dans data.langLevels
  },
  {
    id: "zoom",
    label: "Zoom",
    labelAr: "عن بعد",
    icon: Video,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.18)",
    border: "rgba(59,130,246,0.42)",
    levels: ["En ligne"],
  },
];

export const CAT_BY_ID = Object.fromEntries(SCHOOL_CATS.map(c => [c.id, c]));

/* ---------------------------------------------------------------
   JOURS DE LA SEMAINE
--------------------------------------------------------------- */
export const DAYS_FR = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export const DAY_SHORT = {
  lundi: "Lun", mardi: "Mar", mercredi: "Mer",
  jeudi: "Jeu", vendredi: "Ven", samedi: "Sam", dimanche: "Dim",
};
export const DAY_SHORT_AR = {
  lundi: "الإث", mardi: "الثل", mercredi: "الأر",
  jeudi: "الخم", vendredi: "الجم", samedi: "السب", dimanche: "الأح",
};
// day name → JS getDay() number
export const DAY_JS = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3,
  jeudi: 4, vendredi: 5, samedi: 6,
};

/* ---------------------------------------------------------------
   SESSION GENERATOR
--------------------------------------------------------------- */
/**
 * Generates session objects from a group's schedule.
 * @param {object} sg group
 * @returns {Array} sessions
 */
export function generateSessions(sg) {
  const { id: groupId, days = [], time = "09:00", startDate, endDate } = sg;
  if (!startDate || !endDate || days.length === 0) return [];

  const sessions = [];
  const dayNums = days.map(d => DAY_JS[d]).filter(n => n !== undefined);
  const start = new Date(startDate + "T00:00:00");
  const end   = new Date(endDate   + "T00:00:00");

  // Safety: max 500 sessions
  let count = 0;
  const cur = new Date(start);
  while (cur <= end && count < 500) {
    if (dayNums.includes(cur.getDay())) {
      sessions.push({
        id: uid(),
        groupId,
        date: cur.toISOString().slice(0, 10),
        time,
        status: "planned", // planned | done | cancelled
        note: "",
      });
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return sessions;
}

/* ---------------------------------------------------------------
   PAYMENT HELPERS
--------------------------------------------------------------- */
/**
 * Returns the number of cycles completed for a group.
 * cyclesCompleted = floor(doneSessions / sessionsPerCycle)
 */
export function computeCycles(sessions, group) {
  const done = sessions.filter(s => (s.groupId === group.id || s.groupId === group.id) && s.status === "done").length;
  return Math.floor(done / (group.sessionsPerCycle || 4));
}

/**
 * Returns a complete financial summary for a student in a given academic year.
 * Performs waterfall allocation: Payments -> Previous Debt -> Current Fees
 */
export function getStudentFinancialSummary(data, studentId, activeYearId) {
  const defaultRes = {
    study_fee: 0,
    registration_fee: 500,
    total_due: 500,
    amount_paid: 0,
    remaining_amount: 500,
    payment_status: "NON PAYÉ",

    previousDebt: 0,
    previousDebtPaid: 0,
    previousDebtRemaining: 0,
    registrationFeeAmount: 500,
    registrationFeePaid: 0,
    registrationFeeRemaining: 500,
    registrationFeeStatus: "NON PAYÉ",
    currentFees: 0,
    currentFeesPaid: 0,
    currentFeesRemaining: 0,
    totalExpected: 500,
    totalPaid: 0,
    totalUnpaid: 500,
    credit: 0,
    isSettled: false,
    isEnrolled: false,
    enrollment: null,
    group: null,
  };

  if (!data || typeof data !== "object") return defaultRes;

  const academicYears = Array.isArray(data.academicYears) ? data.academicYears : [];
  const students = Array.isArray(data.students) ? data.students : [];
  const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const debtCarryOvers = Array.isArray(data.debtCarryOvers) ? data.debtCarryOvers : [];
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const payments = Array.isArray(data.payments) ? data.payments : [];

  let yearId = activeYearId;
  if (!yearId && academicYears.length > 0) {
    const currentYear = academicYears.find(y => y && y.isCurrent);
    if (currentYear) yearId = currentYear.id;
  }

  const st = students.find(s => s && s.id === studentId);
  if (!st) return defaultRes;

  // 1. Check enrollment for the selected academic year
  const enrollment = enrollments.find(e => e && e.studentId === studentId && (e.academicYearId === yearId || !e.academicYearId || !yearId));
  const isEnrolled = !!enrollment;
  const groupId = enrollment ? enrollment.groupId : null;
  const price = enrollment 
    ? (enrollment.monthlyPrice ?? enrollment.courseFeeAmount ?? enrollment.agreedPrice ?? (st.monthlyPrice || st.montant || 0)) 
    : (st.monthlyPrice || st.montant || 0);
  const sg = groups.find(s => s && s.id === groupId);

  // 2. Previous Debt (carried over to this year)
  let previousDebt = 0;
  const carryOvers = debtCarryOvers.filter(c => 
    c && c.studentId === studentId && 
    (c.targetAcademicYearId === yearId || c.toYearId === yearId || (!c.targetAcademicYearId && !c.toYearId))
  );
  carryOvers.forEach(c => previousDebt += (Number(c?.amount) || 0));

  // 3. Registration Fee (Frais d'Inscription)
  const defaultFeeSetting = data.settings?.enrollmentFee || 500;
  const registrationFeeAmount = enrollment 
    ? (enrollment.registrationFeeAmount ?? defaultFeeSetting) 
    : (st.enrollmentPaid ? defaultFeeSetting : defaultFeeSetting);

  // 4. Current Course Fees for this year (Frais d'études)
  let currentFees = 0;
  if (sg && isEnrolled) {
    const doneSessions = sessions.filter(s => 
      s && s.groupId === sg.id && 
      s.status === "done" && 
      (!yearId || s.academicYearId === yearId || !s.academicYearId)
    ).length;
    const cycles = Math.max(1, Math.floor(doneSessions / (sg.sessionsPerCycle || 4)));
    currentFees = cycles * price;
  } else if (isEnrolled) {
    currentFees = price;
  }

  // 5. Total Payments Recorded for this student in this academic year
  let totalPaymentsFromRecords = 0;
  let hasExplicitRegPmt = false;

  const stPayments = payments.filter(p => 
    p && p.studentId === studentId && 
    (!yearId || p.academicYearId === yearId || !p.academicYearId)
  );

  stPayments.forEach(p => {
    const isReg = p?.type === "registration" || p?.type === "enrollment" || p?.feeType === "registration";
    if (isReg) hasExplicitRegPmt = true;

    const expected = p?.expectedAmount || p?.amount || price;
    const paid = (p?.paid === true || p?.status === "paid") ? expected : (Number(p?.paidAmount) || 0);
    totalPaymentsFromRecords += (Number(paid) || 0);
  });

  let totalPaid = totalPaymentsFromRecords;

  // Add registration fee paid from student/enrollment status if NOT already recorded as a payment item in payments array
  if (!hasExplicitRegPmt) {
    if (enrollment?.registrationFeePaid !== undefined && enrollment?.registrationFeePaid !== null) {
      totalPaid += Number(enrollment.registrationFeePaid) || 0;
    } else if (enrollment?.registrationFeeStatus === "PAYÉ" || st.enrollmentPaid) {
      totalPaid += registrationFeeAmount;
    }
  }

  // 6. Waterfall Payment Allocation (Previous Debt -> Registration Fee -> Course Fees -> Credit)
  let unallocatedPaid = totalPaid;

  // Step A: Previous Debt
  const previousDebtPaid = Math.min(unallocatedPaid, previousDebt);
  const previousDebtRemaining = previousDebt - previousDebtPaid;
  unallocatedPaid -= previousDebtPaid;

  // Step B: Registration Fee
  const registrationFeePaid = Math.min(unallocatedPaid, registrationFeeAmount);
  const registrationFeeRemaining = Math.max(0, registrationFeeAmount - registrationFeePaid);
  unallocatedPaid -= registrationFeePaid;

  let registrationFeeStatus = "NON PAYÉ";
  if (registrationFeePaid >= registrationFeeAmount && registrationFeeAmount > 0) {
    registrationFeeStatus = "PAYÉ";
  } else if (registrationFeePaid > 0) {
    registrationFeeStatus = "PARTIELLEMENT PAYÉ";
  }

  // Step C: Current Course Fees
  const currentFeesPaid = Math.min(unallocatedPaid, currentFees);
  const currentFeesRemaining = Math.max(0, currentFees - currentFeesPaid);
  unallocatedPaid -= currentFeesPaid;

  // Step D: Credit (Excess payments after all obligations are cleared)
  const credit = unallocatedPaid;

  const totalExpected = previousDebt + registrationFeeAmount + currentFees;
  const totalUnpaid = previousDebtRemaining + registrationFeeRemaining + currentFeesRemaining;

  const study_fee = currentFees;
  const registration_fee = registrationFeeAmount;
  const total_due = totalExpected;
  const amount_paid = totalPaid;
  const remaining_amount = totalUnpaid;
  const payment_status = totalUnpaid === 0 ? "PAYÉ" : (totalPaid > 0 ? "PARTIEL" : "NON PAYÉ");

  return {
    study_fee,
    registration_fee,
    total_due,
    amount_paid,
    remaining_amount,
    payment_status,

    previousDebt,
    previousDebtPaid,
    previousDebtRemaining,
    registrationFeeAmount,
    registrationFeePaid,
    registrationFeeRemaining,
    registrationFeeStatus,
    currentFees,
    currentFeesPaid,
    currentFeesRemaining,
    totalExpected,
    totalPaid,
    totalUnpaid,
    credit,
    isSettled: totalUnpaid === 0,
    isEnrolled,
    isEnrolledThisYear: isEnrolled,
    activeGroupName: isEnrolled ? (sg ? sg.nom : "Inscrit") : "Non inscrit cette année",
    totalCourseFees: currentFees,
    regFeePaid: registrationFeePaid,
    regFeeStatus: registrationFeeStatus,
    regFeeRemaining: registrationFeeRemaining,
    courseFeesRemaining: currentFeesRemaining,
    enrollment,
    group: sg,
  };
}

/* ---------------------------------------------------------------
   LEGACY (kept for backward compatibility with CommGroups etc.)
--------------------------------------------------------------- */
export const NIVEAUX = {
  "Primaire": ["1ère", "2ème", "3ème", "4ème", "5ème"],
  "CEM": ["1ère", "2ème", "3ème", "4ème"],
  "Lycée": ["1ère", "2ème", "3ème"],
};
export const NIVEAU_ICON = { "Primaire": BookOpen, "CEM": School, "Lycée": Landmark };
export const TYPES = ["Normal", "Spécial", "Individuel"];
export const AVATAR_EMOJIS = ["🧑‍🏫", "👩‍🏫", "🧑‍💼", "👨‍💻", "🦉", "📘"];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 14.5,
  color: C.ink,
  outline: "none",
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(4px)",
};
