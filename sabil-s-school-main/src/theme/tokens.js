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
    groups: ["Normal", "Individuel", "Spécial"],
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
    groups: ["Normal", "Individuel", "Spécial"],
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
    groups: ["Normal", "Individuel", "Spécial"],
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
    groups: null,  // pas de groupe intermédiaire, directement sous-groupes
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
    groups: ["Unique"],
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
  if (!data) return { totalPaid: 0, totalUnpaid: 0, isSettled: true, enrollmentPaid: false, previousDebt: 0, currentFees: 0 };
  
  // If activeYearId is not provided, try to find the current year
  let yearId = activeYearId;
  if (!yearId && data.academicYears) {
    const currentYear = data.academicYears.find(y => y.isCurrent);
    if (currentYear) yearId = currentYear.id;
  }

  const st = (data.students || []).find(s => s.id === studentId);
  if (!st) return { totalPaid: 0, totalUnpaid: 0, isSettled: true, enrollmentPaid: false, previousDebt: 0, currentFees: 0 };

  // Get active enrollment for the year
  const enrollment = (data.enrollments || []).find(e => e.studentId === studentId && e.academicYearId === yearId);
  const groupId = enrollment ? enrollment.groupId : null;
  const price = enrollment ? (enrollment.monthlyPrice || 0) : 0;

  // 1. Calculate Previous Debt (carried over to this year)
  let previousDebtTotal = 0;
  const carryOvers = (data.debtCarryOvers || []).filter(c => c.studentId === studentId && (!yearId || !c.toYearId || c.toYearId === yearId || c.toYearId === "manual"));
  carryOvers.forEach(c => previousDebtTotal += (Number(c.amount) || 0));

  // 2. Calculate Current Year Expected Fees
  let currentFeesExpected = 0;
  const sg = (data.groups || []).find(s => s.id === groupId);
  const enrollmentFee = data.settings?.enrollmentFee || 500;

  // Only charge the enrollment fee if they are actually enrolled in this year
  if (enrollment && !st.enrollmentPaid) {
    currentFeesExpected += enrollmentFee;
  }

  // Calculate fees from sessions in this year
  if (sg) {
    const doneSessions = (data.sessions || []).filter(s => 
      (s.groupId === sg.id || s.groupId === sg.id) && 
      s.status === "done" && 
      (!yearId || s.academicYearId === yearId || !s.academicYearId)
    ).length;
    // Enforce 4 sessions per month rule
    const cycles = Math.max(1, Math.floor(doneSessions / 4));
    currentFeesExpected += (cycles * price);
  }

  // 3. Calculate Payments
  let currentFeesPaid = 0;
  let previousDebtPaid = 0;

  // Fetch all payments for this student
  const stPayments = (data.payments || []).filter(p => p.studentId === studentId);
  
  stPayments.forEach(p => {
    const expected = p.expectedAmount || p.amount || price;
    const paid = (p.paid === true || p.status === "paid") ? expected : (p.paidAmount || 0);
    
    if (p.type === "debt") {
      // This is a payment specifically towards a past debt
      previousDebtPaid += paid;
    } else if (!yearId || p.academicYearId === yearId || !p.academicYearId) {
      // Normal current year fee payment
      currentFeesPaid += paid;
    }
  });

  if (st.enrollmentPaid) {
    currentFeesExpected += enrollmentFee;
    currentFeesPaid += enrollmentFee;
  }

  // 4. Separate Balances (No Waterfall Allocation)
  let previousDebtRemaining = previousDebtTotal - previousDebtPaid;
  if (previousDebtRemaining < 0) previousDebtRemaining = 0;

  let currentFeesRemaining = currentFeesExpected - currentFeesPaid;
  if (currentFeesRemaining < 0) currentFeesRemaining = 0;

  const totalUnpaid = previousDebtRemaining + currentFeesRemaining;

  return {
    previousDebt: previousDebtTotal, // Kept for backward compatibility
    previousDebtTotal,
    previousDebtPaid,
    previousDebtRemaining,

    currentFees: currentFeesExpected, // Kept for backward compatibility
    currentFeesExpected,
    currentFeesPaid,
    currentFeesRemaining,

    totalExpected: previousDebtTotal + currentFeesExpected,
    totalPaid: previousDebtPaid + currentFeesPaid,
    totalUnpaid,
    isSettled: totalUnpaid === 0,
    enrollmentPaid: !!st.enrollmentPaid,
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
