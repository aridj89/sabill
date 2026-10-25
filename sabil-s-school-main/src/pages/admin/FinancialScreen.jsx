import React, { useState, useMemo, Component } from "react";
import {
  Landmark, Calendar, Users, TrendingUp, AlertCircle,
  CheckCircle2, DollarSign, Clock, BarChart2,
  Search, History, ShieldCheck, RefreshCw, AlertTriangle, BookOpen, CreditCard, ChevronRight, Check, X,
} from "lucide-react";
import { C, CAT_BY_ID, uid, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

const DA = (n) => {
  const val = Number(n) || 0;
  try { return `${val.toLocaleString()} DA`; } catch { return `${val} DA`; }
};

const MONTHS_KEYS = [
  { key: "09", fr: "Sep", ar: "سبت" },
  { key: "10", fr: "Oct", ar: "أكت" },
  { key: "11", fr: "Nov", ar: "نوف" },
  { key: "12", fr: "Déc", ar: "ديس" },
  { key: "01", fr: "Jan", ar: "جان" },
  { key: "02", fr: "Fév", ar: "فيف" },
  { key: "03", fr: "Mar", ar: "مار" },
  { key: "04", fr: "Avr", ar: "أفر" },
  { key: "05", fr: "Mai", ar: "ماي" },
  { key: "06", fr: "Juin", ar: "جوان" },
  { key: "07", fr: "Juil", ar: "جوي" },
  { key: "08", fr: "Aout", ar: "أوت" },
];

/* --- Error Boundary ---------------------------------------------------- */
class FinanceErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ background: C.surface, border: "1.5px solid #f87171", borderRadius: 20, padding: 36, textAlign: "center" }}>
        <AlertCircle size={48} color="#f87171" style={{ marginBottom: 14 }} />
        <h3 style={{ color: C.ink, fontSize: 20, fontWeight: 800, margin: 0 }}>Erreur d'affichage financier</h3>
        <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: 16, background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          <RefreshCw size={16} style={{ display: "inline", marginRight: 6 }} /> Reessayer
        </button>
      </div>
    );
    return this.props.children;
  }
}

/* --- Interactive Main Category Case ------------------------------------ */
function CategoryCase({
  icon: Icon,
  title,
  subtitle,
  badgeText,
  color,
  bg,
  border,
  active,
  onClick,
  stat1Label,
  stat1Value,
  stat2Label,
  stat2Value,
  stat2Alert,
  hintText,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? bg : C.surface,
        border: `2px solid ${active ? color : (border || C.border)}`,
        borderRadius: 20,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "all 0.22s ease",
        position: "relative",
        boxShadow: active ? `0 6px 28px ${bg}` : "0 6px 20px rgba(0,0,0,0.22)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = border || C.border; }}
    >
      {/* Top row: Icon + Title + Active tag */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: bg, border: `1px solid ${border}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Icon size={24} color={color} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.ink }}>{title}</h3>
                {badgeText && (
                  <span style={{
                    background: `${color}25`,
                    color: color,
                    border: `1px solid ${color}55`,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 8px"
                  }}>
                    {badgeText}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>{subtitle}</div>
            </div>
          </div>
          {active && (
            <span style={{
              background: color, color: "#111",
              fontSize: 11, fontWeight: 900,
              padding: "3px 10px", borderRadius: 999, flexShrink: 0
            }}>
              ✓ فلتر نشط
            </span>
          )}
        </div>

        {/* Numbers grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600 }}>{stat1Label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 2 }}>{stat1Value}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600 }}>{stat2Label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: stat2Alert ? "#f87171" : "#4ade80", marginTop: 2 }}>
              {stat2Value}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action hint */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, fontWeight: 700, color: active ? color : C.inkSoft,
        paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)"
      }}>
        <span>{active ? "اضغط لإلغاء التصفية وعرض الكل" : hintText}</span>
        <ChevronRight size={15} color={active ? color : C.inkSoft} />
      </div>
    </div>
  );
}

/* --- Mini Stat Card ---------------------------------------------------- */
function MiniStatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

/* --- Main FinancialContent --------------------------------------------- */
function FinancialContent({ data, setData, toastFn, activeYearId, onNav }) {
  const { lang } = useLanguage();

  const academicYears = useMemo(() => {
    const list = Array.isArray(data?.academicYears) && data.academicYears.length > 0
      ? data.academicYears
      : [{ id: "ay-2025-2026", name: "2025/2026", isCurrent: true }];
    return list;
  }, [data?.academicYears]);

  const [selectedYearId, setSelectedYearId] = useState(() => {
    if (activeYearId && academicYears.some(y => y?.id === activeYearId)) return activeYearId;
    const current = academicYears.find(y => y?.isCurrent);
    return current?.id || academicYears[0]?.id || "ay-2025-2026";
  });

  React.useEffect(() => {
    if (!selectedYearId || !academicYears.some(y => y?.id === selectedYearId)) {
      const current = academicYears.find(y => y?.isCurrent);
      setSelectedYearId(current?.id || academicYears[0]?.id || "ay-2025-2026");
    }
  }, [academicYears, selectedYearId]);

  const currentYearObj = useMemo(() =>
    academicYears.find(y => y?.id === selectedYearId) || academicYears[0] || null,
    [academicYears, selectedYearId]);

  // "all" | "prev_debt" | "reg_unpaid" | "courses"
  const [activeSection, setActiveSection] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [detailModalStudent, setDetailModalStudent] = useState(null);

  /* -- Quick Toggle Registration Fee Paid / Unpaid -- */
  const handleToggleRegFee = (studentId, currentlyPaid) => {
    if (!setData) return;
    setData(prev => {
      const updatedStudents = (prev?.students || []).map(s => {
        if (s.id === studentId) {
          return { ...s, enrollmentPaid: !currentlyPaid };
        }
        return s;
      });
      const updatedEnrollments = (prev?.enrollments || []).map(e => {
        if (e.studentId === studentId && (e.academicYearId === selectedYearId || !e.academicYearId)) {
          return {
            ...e,
            registrationFeeStatus: !currentlyPaid ? "PAYÉ" : "NON PAYÉ",
            registrationFeePaid: !currentlyPaid ? 500 : 0,
          };
        }
        return e;
      });
      return { ...prev, students: updatedStudents, enrollments: updatedEnrollments };
    });
    if (toastFn) {
      toastFn(
        !currentlyPaid
          ? (lang === "ar" ? "✅ تم تسجيل تسديد حقوق التسجيل (500 DA) بنجاح" : "✅ Frais d'inscription (500 DA) marqués comme payés")
          : (lang === "ar" ? "تم إلغاء تسديد حقوق التسجيل" : "Frais d'inscription annulés")
      );
    }
  };

  /* -- Compute All -- */
  const yearFinancials = useMemo(() => {
    const students = Array.isArray(data?.students) ? data.students : [];
    const payments = (Array.isArray(data?.payments) ? data.payments : []).filter(
      p => p && (p.academicYearId === selectedYearId || !p.academicYearId || !selectedYearId)
    );

    let totalEnrolled = 0;
    let totalMoneyReceived = 0;
    let totalPreviousDebt = 0;
    let totalPreviousDebtUnpaid = 0;
    let totalCurrentFees = 0;
    let totalCurrentFeesUnpaid = 0;
    let totalRegistrationFees = 0;
    let totalRegistrationPaid = 0;
    let totalRegistrationUnpaid = 0;
    let totalCreditGenerated = 0;
    let totalExpectedAll = 0;
    let countRegUnpaid = 0;
    let countRegPaid = 0;
    let countPrevDebt = 0;

    const studentSummaries = students.map(st => {
      if (!st?.id) return null;
      const summary = getStudentFinancialSummary(data, st.id, selectedYearId) || {};
      if (summary.isEnrolled) {
        totalEnrolled++;
        totalPreviousDebt += Number(summary.previousDebt) || 0;
        totalPreviousDebtUnpaid += Number(summary.previousDebtRemaining) || 0;
        totalCurrentFees += Number(summary.currentFees) || 0;
        totalCurrentFeesUnpaid += Number(summary.currentFeesRemaining) || 0;
        totalRegistrationFees += Number(summary.registrationFeeAmount) || 0;
        totalRegistrationPaid += Number(summary.registrationFeePaid) || 0;
        totalRegistrationUnpaid += Number(summary.registrationFeeRemaining) || 0;
        totalMoneyReceived += Number(summary.totalPaid) || 0;
        totalCreditGenerated += Number(summary.credit) || 0;
        totalExpectedAll += Number(summary.totalExpected) || 0;

        if ((summary.registrationFeeRemaining || 0) > 0) {
          countRegUnpaid++;
        } else {
          countRegPaid++;
        }
        if ((summary.previousDebtRemaining || 0) > 0) countPrevDebt++;
      }
      return { student: st, summary };
    }).filter(Boolean);

    const monthlyStats = MONTHS_KEYS.map(m => {
      const mp = payments.filter(p => {
        if (!p) return false;
        return String(p.paidDate || p.date || "").includes(`-${m.key}-`);
      });
      const received = mp.reduce((acc, p) => acc + (Number(p?.paidAmount || p?.amount) || 0), 0);
      return { key: m.key, name: lang === "ar" ? m.ar : m.fr, received: isNaN(received) ? 0 : received, count: mp.length };
    });

    return {
      totalEnrolled, totalExpectedAll, totalMoneyReceived,
      totalPreviousDebt, totalPreviousDebtUnpaid,
      totalCurrentFees, totalCurrentFeesUnpaid,
      totalRegistrationFees, totalRegistrationPaid, totalRegistrationUnpaid,
      totalCreditGenerated, studentSummaries, monthlyStats,
      countRegUnpaid, countRegPaid, countPrevDebt,
    };
  }, [data, selectedYearId, lang]);

  /* -- Filter Students -- */
  const filteredStudents = useMemo(() => {
    const list = Array.isArray(yearFinancials?.studentSummaries) ? yearFinancials.studentSummaries : [];
    return list.filter(item => {
      if (!item?.student || !item?.summary) return false;
      const { student: st, summary } = item;
      if (!summary.isEnrolled) return false;

      // Filter by section
      if (activeSection === "prev_debt" && (summary.previousDebtRemaining || 0) === 0) return false;
      if (activeSection === "reg_unpaid" && (summary.registrationFeeRemaining || 0) === 0) return false;
      if (activeSection === "courses" && (summary.currentFeesRemaining || 0) === 0) return false;

      if (filterGroup !== "all" && summary.group?.id !== filterGroup) return false;
      if (searchQ.trim()) {
        const q = searchQ.toLowerCase().trim();
        const name = `${st.prenom || ""} ${st.nom || ""}`.toLowerCase();
        const code = String(st.studentCode || "").toLowerCase();
        return name.includes(q) || code.includes(q) || String(summary.group?.nom || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [yearFinancials, activeSection, filterGroup, searchQ]);

  const groupsList = Array.isArray(data?.groups) ? data.groups : [];

  if (!data) return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: "center" }}>
      <Clock size={32} color={C.accent} style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Chargement des donnees...</p>
    </div>
  );

  const toggle = (section) => setActiveSection(s => s === section ? "all" : section);
  const L = (ar, fr) => lang === "ar" ? ar : fr;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(226,150,58,0.2)", border: "1px solid rgba(226,150,58,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={22} color={C.accent} />
            </div>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink, margin: 0 }}>
                {L("الإدارة المالية", "Gestion Financière")}
              </h2>
              <p style={{ color: C.inkSoft, fontSize: 13, margin: "3px 0 0" }}>
                {L("ديون سابقة • رسوم التسجيل (500 DA) • رسوم الدراسة (السعر المتفق عليه) — كل خانة مستقلة", "Dettes antérieures • Frais d'inscription (500 DA) • Frais de cours — Chaque section indépendante")}
              </p>
            </div>
          </div>
        </div>

        {/* Academic Year Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1.5px solid ${C.accent}`, borderRadius: 14, padding: "8px 16px" }}>
          <Calendar size={16} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{L("السنة الدراسية:", "Année:")}</span>
          <select value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)}
            style={{ background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, outline: "none", cursor: "pointer", colorScheme: "dark" }}>
            {academicYears.map(y => (
              <option key={y?.id} value={y?.id}>{y?.name} {y?.isCurrent ? "(actuelle)" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {/* =================================================================
          THE 3 MAIN DEDICATED CASES (CARDS)
          1. 🔴 ديون سابقة
          2. 🔵 رسوم التسجيل (500 DA)
          3. 🟡 رسوم الدراسة
      ================================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16, marginBottom: 20 }}>
        
        {/* CASE 1: 🔴 ديون سابقة */}
        <CategoryCase
          icon={AlertTriangle}
          title={L("١. ديون سابقة", "1. Dettes Antérieures")}
          subtitle={L("مبالغ محولة من السنة الماضية", "Dettes de l'année précédente")}
          badgeText={yearFinancials.countPrevDebt > 0 ? `${yearFinancials.countPrevDebt} ${L("تلاميذ", "élèves")}` : undefined}
          color="#f87171"
          bg="rgba(248,113,113,0.12)"
          border="rgba(248,113,113,0.3)"
          active={activeSection === "prev_debt"}
          onClick={() => toggle("prev_debt")}
          stat1Label={L("إجمالي الديون السابقة", "Total dettes")}
          stat1Value={DA(yearFinancials.totalPreviousDebt)}
          stat2Label={L("المتبقي غير المسدد", "Restant impayé")}
          stat2Value={DA(yearFinancials.totalPreviousDebtUnpaid)}
          stat2Alert={yearFinancials.totalPreviousDebtUnpaid > 0}
          hintText={L("👉 انقر لعرض التلاميذ أصحاب الديون السابقة", "👉 Cliquer pour afficher les élèves endettés")}
        />

        {/* CASE 2: 🔵 رسوم التسجيل (500 DA) — المفصولة في خانة وحدها */}
        <CategoryCase
          icon={ShieldCheck}
          title={L("٢. رسوم التسجيل (500 DA)", "2. Frais d'Inscription (500 DA)")}
          subtitle={L("حقوق التسجيل السنوية — خانة مستقلة تماماً", "Frais annuels — Section complètement séparée")}
          badgeText={yearFinancials.countRegUnpaid > 0 ? `${yearFinancials.countRegUnpaid} ${L("لم يدفعوا", "non payés")}` : L("الكل مسدد ✓", "Tous payés ✓")}
          color="#3b82f6"
          bg="rgba(59,130,246,0.14)"
          border="rgba(59,130,246,0.35)"
          active={activeSection === "reg_unpaid"}
          onClick={() => toggle("reg_unpaid")}
          stat1Label={L("المحصل (مسددون)", "Total encaissé")}
          stat1Value={`${DA(yearFinancials.totalRegistrationPaid)} (${yearFinancials.countRegPaid})`}
          stat2Label={L("غير مسدد (المتبقي)", "Non payé")}
          stat2Value={`${DA(yearFinancials.totalRegistrationUnpaid)} (${yearFinancials.countRegUnpaid})`}
          stat2Alert={yearFinancials.countRegUnpaid > 0}
          hintText={L("👉 انقر هنا لعرض التلاميذ الذين لم يدفعوا الـ 500 DA", "👉 Cliquer pour voir les élèves qui n'ont pas payé")}
        />

        {/* CASE 3: 🟡 رسوم الدراسة (السعر المتفق عليه) */}
        <CategoryCase
          icon={BookOpen}
          title={L("٣. رسوم الدراسة", "3. Frais de Cours")}
          subtitle={L("الحصص المنجزة × السعر المتفق عليه لكل تلميذ", "Cycles × Prix convenu par élève")}
          color={C.accent}
          bg="rgba(226,150,58,0.12)"
          border="rgba(226,150,58,0.35)"
          active={activeSection === "courses"}
          onClick={() => toggle("courses")}
          stat1Label={L("إجمالي المستحق", "Total dû")}
          stat1Value={DA(yearFinancials.totalCurrentFees)}
          stat2Label={L("المتبقي غير المدفوع", "Restant impayé")}
          stat2Value={DA(yearFinancials.totalCurrentFeesUnpaid)}
          stat2Alert={yearFinancials.totalCurrentFeesUnpaid > 0}
          hintText={L("👉 انقر لعرض تلاميذ رسوم الدراسة غير المدفوعة", "👉 Cliquer pour filtrer les cours impayés")}
        />

      </div>

      {/* Global Summaries Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MiniStatCard
          icon={Users}
          label={L("تلاميذ مسجلون في السنة", "Élèves inscrits")}
          value={yearFinancials.totalEnrolled}
          color="#818cf8"
          bg="rgba(129,140,248,0.12)"
        />
        <MiniStatCard
          icon={TrendingUp}
          label={L("إجمالي المحصّل الفعلي", "Total encaissé réel")}
          value={DA(yearFinancials.totalMoneyReceived)}
          color="#4ade80"
          bg="rgba(74,222,128,0.12)"
        />
        <MiniStatCard
          icon={AlertCircle}
          label={L("المتبقي العام (تسجيل + ديون + دراسة)", "Reste global")}
          value={DA((yearFinancials.totalPreviousDebtUnpaid || 0) + (yearFinancials.totalRegistrationUnpaid || 0) + (yearFinancials.totalCurrentFeesUnpaid || 0))}
          color="#f87171"
          bg="rgba(248,113,113,0.12)"
        />
        <MiniStatCard
          icon={DollarSign}
          label={L("رصيد فائض للتلاميذ (Crédit)", "Crédit en surplus")}
          value={DA(yearFinancials.totalCreditGenerated)}
          color="#c084fc"
          bg="rgba(192,132,252,0.12)"
        />
      </div>

      {/* Monthly Chart */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <BarChart2 size={18} color={C.accent} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.ink }}>
            {L("التحصيل المالي حسب الشهور", "Recettes Mensuelles")} {currentYearObj?.name ? `(${currentYearObj.name})` : ""}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))", gap: 8 }}>
          {yearFinancials.monthlyStats.map(m => {
            const maxVal = Math.max(...yearFinancials.monthlyStats.map(x => x.received), 1);
            const pct = Math.round((m.received / maxVal) * 100);
            return (
              <div key={m.key} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${m.received > 0 ? "rgba(74,222,128,0.3)" : C.border}`, borderRadius: 12, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.08)", marginBottom: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: m.received > 0 ? "#4ade80" : "transparent", borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: m.received > 0 ? "#4ade80" : C.ink }}>{DA(m.received)}</div>
                <div style={{ fontSize: 9.5, color: C.inkSoft }}>{m.count} pmt</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Filter Notification Bar */}
      {activeSection !== "all" && (
        <div style={{
          background: activeSection === "reg_unpaid" ? "rgba(59,130,246,0.15)" : activeSection === "prev_debt" ? "rgba(248,113,113,0.15)" : "rgba(226,150,58,0.15)",
          border: `1.5px solid ${activeSection === "reg_unpaid" ? "#3b82f6" : activeSection === "prev_debt" ? "#f87171" : C.accent}`,
          borderRadius: 14,
          padding: "12px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeSection === "reg_unpaid" && <ShieldCheck size={20} color="#3b82f6" />}
            {activeSection === "prev_debt" && <AlertTriangle size={20} color="#f87171" />}
            {activeSection === "courses" && <BookOpen size={20} color={C.accent} />}
            <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>
              {activeSection === "reg_unpaid" && L(`🔵 تصفية نشطة: عرض التلاميذ الذين لم يدفعوا حقوق التسجيل 500 DA (${filteredStudents.length} تلميذ)`, `🔵 Filtré : Élèves n'ayant pas payé les 500 DA (${filteredStudents.length})`)}
              {activeSection === "prev_debt" && L(`🔴 تصفية نشطة: عرض التلاميذ أصحاب ديون السنة الماضية (${filteredStudents.length} تلميذ)`, `🔴 Filtré : Élèves avec dettes antérieures (${filteredStudents.length})`)}
              {activeSection === "courses" && L(`🟡 تصفية نشطة: عرض التلاميذ أصحاب رسوم الدراسة غير المسددة (${filteredStudents.length} تلميذ)`, `🟡 Filtré : Élèves avec frais de cours impayés (${filteredStudents.length})`)}
            </span>
          </div>
          <button
            onClick={() => setActiveSection("all")}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              padding: "6px 14px",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <X size={14} />
            {L("إلغاء التصفية (عرض كل التلاميذ)", "Annuler le filtre (Tous)")}
          </button>
        </div>
      )}

      {/* Student Financial Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: C.ink, fontWeight: 800 }}>
              {activeSection === "reg_unpaid" ? L("التلاميذ الذين لم يدفعوا حقوق التسجيل (500 DA)", "Élèves non à jour — Inscription 500 DA")
                : activeSection === "prev_debt" ? L("التلاميذ أصحاب ديون السنة السابقة", "Élèves avec dettes antérieures")
                : activeSection === "courses" ? L("التلاميذ أصحاب رسوم دراسة غير مسددة", "Élèves avec cours impayés")
                : L("جدول المستحقات المالية للتلاميذ", "Bilan financier des élèves")}
            </h3>
            <span style={{
              background: activeSection === "reg_unpaid" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${activeSection === "reg_unpaid" ? "#3b82f6" : C.border}`,
              borderRadius: 999, fontSize: 12, fontWeight: 800,
              color: activeSection === "reg_unpaid" ? "#3b82f6" : C.inkSoft,
              padding: "2px 10px"
            }}>
              {filteredStudents.length} {L("تلميذ", "élèves")}
            </span>
          </div>

          {/* Search & Group Filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px", color: C.ink, fontSize: 13, outline: "none", colorScheme: "dark" }}>
              <option value="all">{L("كل الأفواج", "Tous les groupes")}</option>
              {groupsList.map(g => <option key={g?.id} value={g?.id}>{g?.nom || g?.name}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px" }}>
              <Search size={14} color={C.inkSoft} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder={L("بحث بالتلميذ أو الكود…", "Rechercher...")}
                style={{ background: "transparent", border: "none", color: C.ink, fontSize: 13, outline: "none", width: 150 }} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${C.border}`, textAlign: "left" }}>
                <th style={{ padding: "12px 14px", color: C.inkSoft }}>{L("التلميذ", "Élève")}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{L("الفوج والسعر المتفق عليه", "Groupe & Tarif")}</th>
                
                {/* 🔴 ديون سابقة */}
                <th style={{ padding: "12px 14px", color: "#f87171", textAlign: "center", borderLeft: "1px solid rgba(248,113,113,0.25)" }}>
                  🔴 {L("ديون سابقة", "Dettes ant.")}
                </th>

                {/* 🔵 رسوم التسجيل (500 DA) */}
                <th style={{ padding: "12px 14px", color: "#3b82f6", textAlign: "center", borderLeft: "1.5px solid rgba(59,130,246,0.35)", background: activeSection === "reg_unpaid" ? "rgba(59,130,246,0.08)" : "transparent" }}>
                  🔵 {L("رسوم التسجيل 500 DA", "Inscription 500 DA")}
                </th>

                {/* 🟡 رسوم دراسة */}
                <th style={{ padding: "12px 14px", color: C.accent, textAlign: "center", borderLeft: "1px solid rgba(226,150,58,0.25)" }}>
                  🟡 {L("رسوم دراسة", "Frais cours")}
                </th>

                <th style={{ padding: "12px 14px", color: "#4ade80", textAlign: "center", borderLeft: `1px solid ${C.border}` }}>
                  {L("المدفوع", "Payé")}
                </th>
                <th style={{ padding: "12px 14px", color: "#f87171", textAlign: "center" }}>
                  {L("المتبقي", "Restant")}
                </th>
                <th style={{ padding: "12px 14px", color: "#c084fc", textAlign: "center" }}>
                  {L("رصيد", "Crédit")}
                </th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>
                  {L("تفاصيل", "Détails")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 36, textAlign: "center", color: C.inkSoft }}>
                    {activeSection === "reg_unpaid" ? (
                      <div>
                        <CheckCircle2 size={36} color="#4ade80" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#4ade80" }}>
                          {L("ممتاز! جميع التلاميذ دفعوا حقوق التسجيل 500 DA", "Tous les élèves ont réglé les frais d'inscription 500 DA !")}
                        </div>
                      </div>
                    ) : (
                      L("لا توجد بيانات مطابقة للبحث", "Aucune donnée trouvée")
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map(({ student: st, summary }) => {
                  if (!st || !summary) return null;

                  const isRegPaid = (summary.registrationFeeRemaining || 0) === 0;
                  const regColor = isRegPaid ? "#4ade80" : "#f87171";
                  const agreedPrice = summary.enrollment?.monthlyPrice 
                    ?? summary.enrollment?.courseFeeAmount 
                    ?? st.monthlyPrice 
                    ?? summary.group?.price 
                    ?? 0;

                  return (
                    <tr
                      key={st.id}
                      onClick={() => setDetailModalStudent(st)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Nom + Code */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, color: C.ink }}>{st.prenom} {st.nom}</div>
                        {st.studentCode && (
                          <div style={{ fontSize: 10.5, color: C.inkSoft, fontFamily: "monospace" }}>{st.studentCode}</div>
                        )}
                      </td>

                      {/* Groupe & Agreed Price */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontWeight: 600, color: C.ink }}>{summary.group?.nom || "—"}</div>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginTop: 2 }}>
                          {agreedPrice > 0 ? `${DA(agreedPrice)} / ${L("دورة", "cycle")}` : "—"}
                        </div>
                      </td>

                      {/* 🔴 Dettes antérieures */}
                      <td style={{ padding: "12px 14px", textAlign: "center", borderLeft: "1px solid rgba(248,113,113,0.15)" }}>
                        {(summary.previousDebt || 0) > 0 ? (
                          <div>
                            <div style={{ fontWeight: 800, color: "#f87171" }}>{DA(summary.previousDebtRemaining)}</div>
                            <div style={{ fontSize: 10, color: C.inkSoft }}>/ {DA(summary.previousDebt)}</div>
                          </div>
                        ) : <span style={{ color: C.inkSoft }}>—</span>}
                      </td>

                      {/* 🔵 Frais d'inscription 500 DA (Case وحدها مع زر تبديل مباشر) */}
                      <td style={{
                        padding: "10px 14px",
                        textAlign: "center",
                        borderLeft: "1.5px solid rgba(59,130,246,0.25)",
                        background: activeSection === "reg_unpaid" ? "rgba(59,130,246,0.05)" : "transparent"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                          <span style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: regColor,
                            background: `${regColor}20`,
                            border: `1px solid ${regColor}44`,
                            padding: "3px 10px",
                            borderRadius: 8,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}>
                            {isRegPaid ? (
                              <>
                                <Check size={12} />
                                {L("مسدد 500 DA", "Payé 500 DA")}
                              </>
                            ) : (
                              <>
                                <X size={12} />
                                {L("غير مسدد (500 DA)", "Non payé (500 DA)")}
                              </>
                            )}
                          </span>

                          {/* Quick Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRegFee(st.id, isRegPaid);
                            }}
                            title={isRegPaid ? L("إلغاء التسديد", "Marquer impayé") : L("تسجيل الدفع 500 DA", "Marquer payé")}
                            style={{
                              background: isRegPaid ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.25)",
                              border: `1px solid ${isRegPaid ? "rgba(255,255,255,0.15)" : "#3b82f6"}`,
                              borderRadius: 6,
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                              color: isRegPaid ? C.inkSoft : "#93c5fd",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {isRegPaid ? L("إلغاء", "Annuler") : L("تسديد 500 DA ⚡", "Régler 500 DA ⚡")}
                          </button>
                        </div>
                      </td>

                      {/* 🟡 Frais de cours */}
                      <td style={{ padding: "12px 14px", textAlign: "center", borderLeft: "1px solid rgba(226,150,58,0.15)" }}>
                        <div style={{ fontWeight: 700, color: C.accent }}>{DA(summary.currentFees)}</div>
                        {(summary.currentFeesRemaining || 0) > 0 ? (
                          <div style={{ fontSize: 10.5, color: "#f87171", marginTop: 2, fontWeight: 700 }}>
                            {DA(summary.currentFeesRemaining)} {L("متبقي", "restant")}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: "#4ade80", marginTop: 2 }}>{L("مكتمل ✓", "Réglé ✓")}</div>
                        )}
                      </td>

                      {/* Payé */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "#4ade80", fontWeight: 700, borderLeft: `1px solid ${C.border}` }}>
                        {DA(summary.totalPaid)}
                      </td>

                      {/* Restant */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80", fontWeight: 800 }}>
                        {(summary.totalUnpaid || 0) > 0 ? DA(summary.totalUnpaid) : "0 DA"}
                      </td>

                      {/* Crédit */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: (summary.credit || 0) > 0 ? "#c084fc" : C.inkSoft, fontWeight: (summary.credit || 0) > 0 ? 800 : 400 }}>
                        {(summary.credit || 0) > 0 ? `+${DA(summary.credit)}` : "—"}
                      </td>

                      {/* Details Modal */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setDetailModalStudent(st); }}
                          style={{
                            background: "rgba(226,150,58,0.15)",
                            border: "1px solid rgba(226,150,58,0.4)",
                            borderRadius: 8,
                            padding: "4px 10px",
                            color: C.accent,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          <History size={12} style={{ display: "inline", marginRight: 4 }} />
                          {L("التفاصيل", "Détails")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailModalStudent && (
        <StudentFinancialHistoryModal
          student={detailModalStudent}
          data={data}
          onClose={() => setDetailModalStudent(null)}
        />
      )}
    </div>
  );
}

/* ─── Export ─────────────────────────────────────────────────────────────── */
export default function FinancialScreen(props) {
  return (
    <FinanceErrorBoundary>
      <FinancialContent {...props} />
    </FinanceErrorBoundary>
  );
}

/* ─── History Modal ───────────────────────────────────────────────────────── */
function StudentFinancialHistoryModal({ student, data, onClose }) {
  const { lang } = useLanguage();
  if (!student) return null;
  const L = (ar, fr) => lang === "ar" ? ar : fr;

  const academicYears = Array.isArray(data?.academicYears) ? data.academicYears : [];
  const histories = academicYears.map(y => {
    if (!y) return null;
    const summary = getStudentFinancialSummary(data, student.id, y.id) || {};
    return { year: y, summary };
  }).filter(Boolean);

  const grandTotalUnpaid = histories.reduce((acc, h) => acc + (Number(h?.summary?.totalUnpaid) || 0), 0);
  const grandTotalCredit = histories.reduce((acc, h) => acc + (Number(h?.summary?.credit) || 0), 0);

  return (
    <Modal title={`${L("السجل المالي التفصيلي:", "Détail Financier:")} ${student.prenom || ""} ${student.nom || ""}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {histories.map(({ year, summary }) => {
          const isRegPaid = (summary.registrationFeeRemaining || 0) === 0;
          return (
            <div key={year?.id || Math.random()} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>📅 {year?.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: summary.isEnrolled ? "#4ade80" : C.inkSoft }}>
                  {summary.isEnrolled ? `${L("مسجل —", "Inscrit —")} ${summary.group?.nom || "—"}` : L("غير مسجل", "Non inscrit")}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                {/* 🔴 Dettes */}
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: "#f87171", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🔴 {L("ديون سابقة", "Dettes ant.")}</div>
                  <div style={{ fontWeight: 800, color: (summary.previousDebt || 0) > 0 ? "#f87171" : C.inkSoft }}>{DA(summary.previousDebt)}</div>
                  {(summary.previousDebtRemaining || 0) > 0 && <div style={{ fontSize: 10.5, color: "#f87171" }}>{DA(summary.previousDebtRemaining)} {L("متبقي", "restant")}</div>}
                </div>
                {/* 🔵 Inscription */}
                <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🔵 {L("رسوم تسجيل (500 DA)", "Inscription")}</div>
                  <div style={{ fontWeight: 800, color: C.ink }}>{DA(summary.registrationFeeAmount)}</div>
                  <div style={{ fontSize: 10.5, color: isRegPaid ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                    {isRegPaid ? L("مدفوع ✓", "Payé ✓") : L("لم يُدفع ✗", "Non payé ✗")}
                  </div>
                </div>
                {/* 🟡 Frais cours */}
                <div style={{ background: "rgba(226,150,58,0.08)", border: "1px solid rgba(226,150,58,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: C.accent, fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🟡 {L("رسوم دراسة", "Frais cours")}</div>
                  <div style={{ fontWeight: 800, color: C.ink }}>{DA(summary.currentFees)}</div>
                  {(summary.currentFeesRemaining || 0) > 0 && <div style={{ fontSize: 10.5, color: "#f87171" }}>{DA(summary.currentFeesRemaining)} {L("متبقي", "restant")}</div>}
                </div>
                {/* Payé */}
                <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{L("المدفوع", "Total payé")}</div>
                  <div style={{ fontWeight: 800, color: "#4ade80" }}>{DA(summary.totalPaid)}</div>
                </div>
                {/* Restant */}
                <div style={{ background: (summary.totalUnpaid || 0) > 0 ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)", border: `1px solid ${(summary.totalUnpaid || 0) > 0 ? "rgba(248,113,113,0.22)" : "rgba(74,222,128,0.22)"}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{L("المتبقي", "Restant")}</div>
                  <div style={{ fontWeight: 800, color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80" }}>
                    {(summary.totalUnpaid || 0) > 0 ? DA(summary.totalUnpaid) : "0 DA"}
                  </div>
                </div>
                {/* Crédit */}
                {(summary.credit || 0) > 0 && (
                  <div style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ color: "#c084fc", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{L("رصيد فائض", "Crédit")}</div>
                    <div style={{ fontWeight: 800, color: "#c084fc" }}>+{DA(summary.credit)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)", borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{L("إجمالي الديون التراكمية (كل السنوات)", "TOTAL DETTE CUMULÉE")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: grandTotalUnpaid > 0 ? "#f87171" : "#4ade80" }}>{DA(grandTotalUnpaid)}</div>
          </div>
          {grandTotalCredit > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{L("رصيد فائض إجمالي", "CRÉDIT GLOBAL")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#c084fc" }}>+{DA(grandTotalCredit)}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
