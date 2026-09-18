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
  let previousDebt = 0;
  const carryOvers = (data.debtCarryOvers || []).filter(c => c.studentId === studentId && (!yearId || !c.toYearId || c.toYearId === yearId || c.toYearId === "manual"));
  carryOvers.forEach(c => previousDebt += (Number(c.amount) || 0));

  // 2. Calculate Current Year Expected Fees
  let currentFees = 0;
  const sg = (data.groups || []).find(s => s.id === groupId);
  const enrollmentFee = data.settings?.enrollmentFee || 500;

  if (!st.enrollmentPaid) {
    currentFees += enrollmentFee;
  }

  // Calculate fees from sessions in this year
  // For safety, only consider sessions that belong to the active year if sg is active in this year
  if (sg) {
    const doneSessions = (data.sessions || []).filter(s => 
      (s.groupId === sg.id || s.groupId === sg.id) && 
      s.status === "done" && 
      (!yearId || s.academicYearId === yearId || !s.academicYearId)
    ).length;
    const cycles = Math.max(1, Math.floor(doneSessions / (sg.sessionsPerCycle || 4)));
    currentFees += (cycles * price);
  }

  // 3. Calculate Total Paid in this Year
  let totalPaid = 0;
  const stPayments = (data.payments || []).filter(p => 
    p.studentId === studentId && 
    (!yearId || p.academicYearId === yearId || !p.academicYearId)
  );
  
  stPayments.forEach(p => {
    const expected = p.expectedAmount || p.amount || price;
    const paid = (p.paid === true || p.status === "paid") ? expected : (p.paidAmount || 0);
    totalPaid += paid;
  });

  if (st.enrollmentPaid) {
    // If enrollment is paid, we assume it's part of the total paid logic or handled separately.
    // Wait, if enrollment is paid, it means they paid 500. So we add 500 to total paid, and 500 to currentFees expected, so it balances out?
    // Let's add it to both so the numbers align perfectly.
    currentFees += enrollmentFee;
    totalPaid += enrollmentFee;
  }

  // 4. Waterfall Allocation
  let allocatedPaid = totalPaid;
  
  let previousDebtRemaining = previousDebt;
  if (allocatedPaid >= previousDebtRemaining) {
    allocatedPaid -= previousDebtRemaining;
    previousDebtRemaining = 0;
  } else {
    previousDebtRemaining -= allocatedPaid;
    allocatedPaid = 0;
  }

  let currentFeesRemaining = currentFees - allocatedPaid;
  if (currentFeesRemaining < 0) currentFeesRemaining = 0;

  const totalUnpaid = previousDebtRemaining + currentFeesRemaining;

  return {
    previousDebt,
    currentFees,
    totalExpected: previousDebt + currentFees,
    totalPaid,
    previousDebtRemaining,
    currentFeesRemaining,
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
