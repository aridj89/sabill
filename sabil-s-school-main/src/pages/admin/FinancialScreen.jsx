import React, { useState, useMemo, Component } from "react";
import {
  Landmark, Calendar, Users, TrendingUp, AlertCircle,
  CheckCircle2, DollarSign, Clock, BarChart2,
  Search, History, ShieldCheck, RefreshCw, AlertTriangle, BookOpen, CreditCard, ChevronRight,
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

/* --- Stat Card ---------------------------------------------------------- */
function StatCard({ icon: Icon, label, value, sub, color, bg, border, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? bg : C.surface,
        border: `1.5px solid ${active ? color : (border || C.border)}`,
        borderRadius: 18, padding: "18px 20px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: active ? `0 4px 24px ${bg}` : "0 8px 24px rgba(0,0,0,0.2)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.18s ease",
      }}
      onMouseEnter={e => onClick && !active && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => onClick && !active && (e.currentTarget.style.borderColor = border || C.border)}
    >
      <div style={{ width: 52, height: 52, borderRadius: 15, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color, fontWeight: 700, marginTop: 3 }}>{sub}</div>}
        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

/* --- Section Block ----------------------------------------------------- */
function SectionBlock({ icon: Icon, color, bg, border, title, subtitle, count, countColor, totalLabel, totalValue, unpaidLabel, unpaidValue, btnLabel, active, onToggle }) {
  return (
    <div style={{
      background: C.surface,
      border: `1.5px solid ${active ? color : border}`,
      borderRadius: 20, padding: 22, marginBottom: 20,
      boxShadow: active ? `0 4px 24px ${bg}` : "0 4px 16px rgba(0,0,0,0.2)",
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        {/* Left: icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={21} color={color} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.ink }}>{title}</h3>
              {count !== undefined && (
                <span style={{ background: `${countColor || color}25`, color: countColor || color, border: `1px solid ${countColor || color}55`, borderRadius: 999, fontSize: 11, fontWeight: 800, padding: "2px 8px" }}>
                  {count}
                </span>
              )}
            </div>
            {subtitle && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>

        {/* Right: numbers + button */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700 }}>{totalLabel}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{totalValue}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700 }}>{unpaidLabel}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: Number(String(unpaidValue).replace(/[^\d]/g, "")) > 0 ? "#f87171" : "#4ade80" }}>{unpaidValue}</div>
          </div>
          <button onClick={onToggle} style={{
            background: active ? `${color}30` : `${color}15`,
            border: `1px solid ${color}80`,
            borderRadius: 10, padding: "8px 16px", color, fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {btnLabel}
            <ChevronRight size={14} />
          </button>
        </div>
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
        if ((summary.registrationFeeRemaining || 0) > 0) countRegUnpaid++;
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
      countRegUnpaid, countPrevDebt,
    };
  }, [data, selectedYearId, lang]);

  /* -- Filter -- */
  const filteredStudents = useMemo(() => {
    const list = Array.isArray(yearFinancials?.studentSummaries) ? yearFinancials.studentSummaries : [];
    return list.filter(item => {
      if (!item?.student || !item?.summary) return false;
      const { student: st, summary } = item;
      if (!summary.isEnrolled) return false;
      if (activeSection === "prev_debt" && (summary.previousDebtRemaining || 0) === 0) return false;
      if (activeSection === "reg_unpaid" && (summary.registrationFeeRemaining || 0) === 0) return false;
      if (activeSection === "courses" && (summary.currentFees || 0) === 0) return false;
      if (filterGroup !== "all" && summary.group?.id !== filterGroup) return false;
      if (searchQ.trim()) {
        const q = searchQ.toLowerCase().trim();
        const name = `${st.prenom || ""} ${st.nom || ""}`.toLowerCase();
        return name.includes(q) || String(summary.group?.nom || "").toLowerCase().includes(q);
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(226,150,58,0.2)", border: "1px solid rgba(226,150,58,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={20} color={C.accent} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink, margin: 0 }}>
              {L("الإدارة المالية", "Gestion Financiere")}
            </h2>
          </div>
          <p style={{ color: C.inkSoft, fontSize: 13, margin: "4px 0 0" }}>
            {L("ديون سابقة • رسوم تسجيل (500 DA) • رسوم دراسة — كل قسم مستقل", "Dettes anterieures · Frais inscription (500 DA) · Frais de cours — chaque section separee")}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1.5px solid ${C.accent}`, borderRadius: 14, padding: "8px 16px" }}>
          <Calendar size={16} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{L("السنة:", "Annee:")}</span>
          <select value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)}
            style={{ background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, outline: "none", cursor: "pointer", colorScheme: "dark" }}>
            {academicYears.map(y => (
              <option key={y?.id} value={y?.id}>{y?.name} {y?.isCurrent ? "(actuelle)" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={Users}
          label={L("تلاميذ مسجلون", "Eleves inscrits")}
          value={yearFinancials.totalEnrolled}
          sub={currentYearObj?.name || ""}
          color="#818cf8" bg="rgba(129,140,248,0.15)" border="rgba(129,140,248,0.35)" />
        <StatCard icon={TrendingUp}
          label={L("إجمالي المحصّل", "Total encaisse")}
          value={DA(yearFinancials.totalMoneyReceived)}
          sub={L("مجموع المدفوعات الفعلية", "Paiements effectivement recus")}
          color="#4ade80" bg="rgba(74,222,128,0.15)" border="rgba(74,222,128,0.35)" />
        <StatCard icon={AlertTriangle}
          label={L("إجمالي غير المدفوع", "Total restant a payer")}
          value={DA((yearFinancials.totalPreviousDebtUnpaid || 0) + (yearFinancials.totalRegistrationUnpaid || 0) + (yearFinancials.totalCurrentFeesUnpaid || 0))}
          sub={L("ديون + تسجيل + دراسة", "Dettes + Inscription + Cours")}
          color="#f87171" bg="rgba(248,113,113,0.15)" border="rgba(248,113,113,0.35)" />
        <StatCard icon={DollarSign}
          label={L("رصيد فائض (Crédit)", "Credits (Surplus)")}
          value={DA(yearFinancials.totalCreditGenerated)}
          sub={L("دفعات زائدة محفوظة للتلميذ", "Surplus conserve")}
          color="#c084fc" bg="rgba(192,132,252,0.15)" border="rgba(192,132,252,0.35)" />
      </div>

      {/* =================================================================
          SECTION 1 — ديون سابقة
      ================================================================= */}
      <SectionBlock
        icon={AlertTriangle}
        color="#f87171" bg="rgba(248,113,113,0.15)" border="rgba(248,113,113,0.3)"
        title={L("١.  الديون السابقة", "1.  Dettes Anterieures")}
        subtitle={L("مبالغ محوّلة من سنوات دراسية سابقة", "Montants reportes des annees precedentes")}
        count={yearFinancials.countPrevDebt > 0 ? `${yearFinancials.countPrevDebt} ${L("تلميذ", "eleves")}` : undefined}
        countColor="#f87171"
        totalLabel={L("إجمالي الديون السابقة", "Total dettes anterieures")}
        totalValue={DA(yearFinancials.totalPreviousDebt)}
        unpaidLabel={L("المتبقي غير المسدّد", "Restant a recouvrer")}
        unpaidValue={DA(yearFinancials.totalPreviousDebtUnpaid)}
        btnLabel={activeSection === "prev_debt" ? L("إلغاء الفلتر", "Annuler filtre") : L("عرض التلاميذ", "Voir les eleves")}
        active={activeSection === "prev_debt"}
        onToggle={() => toggle("prev_debt")}
      />

      {/* =================================================================
          SECTION 2 — رسوم التسجيل 500 DA (مستقلة)
      ================================================================= */}
      <SectionBlock
        icon={ShieldCheck}
        color="#3b82f6" bg="rgba(59,130,246,0.15)" border="rgba(59,130,246,0.3)"
        title={L("٢.  رسوم التسجيل (500 DA)", "2.  Frais d'Inscription (500 DA)")}
        subtitle={L("حقوق التسجيل السنوية — مستقلة تماماً عن رسوم الدراسة", "Frais annuels d'inscription — independants des frais de cours")}
        count={yearFinancials.countRegUnpaid > 0 ? `${yearFinancials.countRegUnpaid} ${L("لم يدفعوا", "non payes")}` : undefined}
        countColor="#f87171"
        totalLabel={L("المحصّل من التسجيل", "Inscription payee")}
        totalValue={DA(yearFinancials.totalRegistrationPaid)}
        unpaidLabel={L("لم يُسدَّد بعد", "Non paye")}
        unpaidValue={DA(yearFinancials.totalRegistrationUnpaid)}
        btnLabel={activeSection === "reg_unpaid" ? L("إلغاء الفلتر", "Annuler filtre") : L("التلاميذ اللي ما دفعوش", "Voir les non-payeurs")}
        active={activeSection === "reg_unpaid"}
        onToggle={() => toggle("reg_unpaid")}
      />

      {/* =================================================================
          SECTION 3 — رسوم الدراسة (السعر المتفق عليه)
      ================================================================= */}
      <SectionBlock
        icon={BookOpen}
        color={C.accent} bg="rgba(226,150,58,0.15)" border="rgba(226,150,58,0.3)"
        title={L("٣.  رسوم الدراسة (السعر المتفق عليه)", "3.  Frais de Cours (Prix convenu par eleve)")}
        subtitle={L("محسوبة حسب الدورات المنجزة × السعر المتفق عليه لكل تلميذ", "Calcules selon les cycles effectues × le prix convenu par eleve")}
        totalLabel={L("المستحق من رسوم الدراسة", "Total frais de cours dus")}
        totalValue={DA(yearFinancials.totalCurrentFees)}
        unpaidLabel={L("غير مدفوع", "Non paye")}
        unpaidValue={DA(yearFinancials.totalCurrentFeesUnpaid)}
        btnLabel={activeSection === "courses" ? L("إلغاء الفلتر", "Annuler filtre") : L("عرض التلاميذ", "Voir les eleves")}
        active={activeSection === "courses"}
        onToggle={() => toggle("courses")}
      />

      {/* Monthly chart */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <BarChart2 size={18} color={C.accent} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.ink }}>
            {L("التحصيل الشهري", "Recettes Mensuelles")} {currentYearObj?.name ? `— ${currentYearObj.name}` : ""}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
          {yearFinancials.monthlyStats.map(m => {
            const maxVal = Math.max(...yearFinancials.monthlyStats.map(x => x.received), 1);
            const pct = Math.round((m.received / maxVal) * 100);
            return (
              <div key={m.key} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${m.received > 0 ? "rgba(74,222,128,0.3)" : C.border}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, marginBottom: 6 }}>{m.name}</div>
                <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.08)", marginBottom: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: m.received > 0 ? "#4ade80" : "transparent", borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: m.received > 0 ? "#4ade80" : C.ink }}>{DA(m.received)}</div>
                <div style={{ fontSize: 10, color: C.inkSoft }}>{m.count} pmt</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: C.ink, fontWeight: 800 }}>
              {activeSection === "prev_debt" && L("🔴 تلاميذ عليهم ديون سابقة", "🔴 Eleves avec dettes anterieures")}
              {activeSection === "reg_unpaid" && L("🔵 تلاميذ لم يدفعوا حقوق التسجيل (500 DA)", "🔵 Eleves n'ayant pas paye les frais d'inscription")}
              {activeSection === "courses" && L("🟡 رسوم الدراسة — تفصيل", "🟡 Frais de cours — detail")}
              {activeSection === "all" && L("جدول المستحقات المالية", "Bilan financier des eleves")}
            </h3>
            {activeSection !== "all" && (
              <button onClick={() => setActiveSection("all")} style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.inkSoft, fontSize: 12, cursor: "pointer" }}>
                x {L("إلغاء", "Effacer")}
              </button>
            )}
            <span style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 12, fontWeight: 800, color: C.inkSoft, padding: "2px 10px" }}>
              {filteredStudents.length}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px", color: C.ink, fontSize: 13, outline: "none", colorScheme: "dark" }}>
              <option value="all">{L("كل الأفواج", "Tous les groupes")}</option>
              {groupsList.map(g => <option key={g?.id} value={g?.id}>{g?.nom}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px" }}>
              <Search size={14} color={C.inkSoft} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder={L("بحث…", "Rechercher...")}
                style={{ background: "transparent", border: "none", color: C.ink, fontSize: 13, outline: "none", width: 130 }} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${C.border}`, textAlign: "left" }}>
                <th style={{ padding: "12px 14px", color: C.inkSoft }}>{L("التلميذ", "Eleve")}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{L("الفوج", "Groupe")}</th>
                <th style={{ padding: "12px 14px", color: "#f87171", textAlign: "center", borderLeft: "1px solid rgba(248,113,113,0.2)" }}>
                  🔴 {L("ديون سابقة", "Dettes ant.")}
                </th>
                <th style={{ padding: "12px 14px", color: "#3b82f6", textAlign: "center", borderLeft: "1px solid rgba(59,130,246,0.2)" }}>
                  🔵 {L("تسجيل 500 DA", "Inscription 500 DA")}
                </th>
                <th style={{ padding: "12px 14px", color: C.accent, textAlign: "center", borderLeft: "1px solid rgba(226,150,58,0.2)" }}>
                  🟡 {L("رسوم دراسة", "Frais cours")}
                </th>
                <th style={{ padding: "12px 14px", color: "#4ade80", textAlign: "center", borderLeft: `1px solid ${C.border}` }}>
                  {L("المدفوع", "Paye")}
                </th>
                <th style={{ padding: "12px 14px", color: "#f87171", textAlign: "center" }}>
                  {L("المتبقي", "Restant")}
                </th>
                <th style={{ padding: "12px 14px", color: "#c084fc", textAlign: "center" }}>
                  {L("رصيد", "Credit")}
                </th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>
                  {L("تفاصيل", "Details")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 30, textAlign: "center", color: C.inkSoft }}>
                    {activeSection === "reg_unpaid"
                      ? L("جميع التلاميذ دفعوا حقوق التسجيل", "Tous les eleves ont paye leur inscription")
                      : L("لا توجد بيانات", "Aucune donnee disponible")}
                  </td>
                </tr>
              ) : (
                filteredStudents.map(({ student: st, summary }) => {
                  if (!st || !summary) return null;
                  const regColor = summary.registrationFeeStatus === "PAYE" ? "#4ade80"
                    : summary.registrationFeeStatus === "PARTIELLEMENT PAYE" ? "#fbbf24"
                    : "#f87171";
                  const regLabel = summary.registrationFeeStatus === "PAYE" ? L("مدفوع ✓", "Paye")
                    : summary.registrationFeeStatus === "PARTIELLEMENT PAYE" ? L("جزئي", "Partiel")
                    : L("لم يُدفع ✗", "Non paye");

                  return (
                    <tr key={st.id} onClick={() => setDetailModalStudent(st)}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, color: C.ink }}>{st.prenom} {st.nom}</div>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: C.inkSoft }}>
                        {summary.group?.nom || "—"}
                      </td>

                      {/* 🔴 Dettes */}
                      <td style={{ padding: "12px 14px", textAlign: "center", borderLeft: "1px solid rgba(248,113,113,0.1)" }}>
                        {(summary.previousDebt || 0) > 0 ? (
                          <div>
                            <div style={{ fontWeight: 800, color: "#f87171" }}>{DA(summary.previousDebtRemaining)}</div>
                            <div style={{ fontSize: 10, color: C.inkSoft }}>/ {DA(summary.previousDebt)}</div>
                          </div>
                        ) : <span style={{ color: C.inkSoft }}>—</span>}
                      </td>

                      {/* 🔵 Inscription */}
                      <td style={{ padding: "12px 14px", textAlign: "center", borderLeft: "1px solid rgba(59,130,246,0.1)" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: regColor, background: `${regColor}20`, border: `1px solid ${regColor}44`, padding: "3px 9px", borderRadius: 6 }}>
                          {regLabel}
                        </span>
                        {(summary.registrationFeeRemaining || 0) > 0 && (
                          <div style={{ fontSize: 10.5, color: "#f87171", fontWeight: 700, marginTop: 3 }}>
                            {DA(summary.registrationFeeRemaining)} {L("متبقي", "restant")}
                          </div>
                        )}
                      </td>

                      {/* 🟡 Frais cours */}
                      <td style={{ padding: "12px 14px", textAlign: "center", borderLeft: "1px solid rgba(226,150,58,0.1)" }}>
                        <div style={{ fontWeight: 700, color: C.accent }}>{DA(summary.currentFees)}</div>
                        {(summary.currentFeesRemaining || 0) > 0 && (
                          <div style={{ fontSize: 10.5, color: "#f87171", marginTop: 2 }}>
                            {DA(summary.currentFeesRemaining)} {L("متبقي", "restant")}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "center", color: "#4ade80", fontWeight: 700, borderLeft: `1px solid ${C.border}` }}>
                        {DA(summary.totalPaid)}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80", fontWeight: 800 }}>
                        {(summary.totalUnpaid || 0) > 0 ? DA(summary.totalUnpaid) : "0 DA"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: (summary.credit || 0) > 0 ? "#c084fc" : C.inkSoft, fontWeight: (summary.credit || 0) > 0 ? 800 : 400 }}>
                        {(summary.credit || 0) > 0 ? `+${DA(summary.credit)}` : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button onClick={e => { e.stopPropagation(); setDetailModalStudent(st); }}
                          style={{ background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)", borderRadius: 8, padding: "4px 10px", color: C.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                          <History size={12} style={{ display: "inline", marginRight: 4 }} />
                          {L("التفاصيل", "Details")}
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
    <Modal title={`${L("السجل المالي:", "Detail Financier:")} ${student.prenom || ""} ${student.nom || ""}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {histories.map(({ year, summary }) => (
          <div key={year?.id || Math.random()} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>📅 {year?.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: summary.isEnrolled ? "#4ade80" : C.inkSoft }}>
                {summary.isEnrolled ? `${L("مسجل —", "Inscrit —")} ${summary.group?.nom || "—"}` : L("غير مسجل", "Non inscrit")}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: "#f87171", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🔴 {L("ديون سابقة", "Dettes ant.")}</div>
                <div style={{ fontWeight: 800, color: (summary.previousDebt || 0) > 0 ? "#f87171" : C.inkSoft }}>{DA(summary.previousDebt)}</div>
                {(summary.previousDebtRemaining || 0) > 0 && <div style={{ fontSize: 10.5, color: "#f87171" }}>{DA(summary.previousDebtRemaining)} {L("متبقي", "restant")}</div>}
              </div>
              <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🔵 {L("رسوم تسجيل", "Inscription")}</div>
                <div style={{ fontWeight: 800, color: C.ink }}>{DA(summary.registrationFeeAmount)}</div>
                <div style={{ fontSize: 10.5, color: summary.registrationFeeStatus === "PAYE" ? "#4ade80" : "#f87171" }}>
                  {summary.registrationFeeStatus || "NON PAYE"}
                </div>
              </div>
              <div style={{ background: "rgba(226,150,58,0.08)", border: "1px solid rgba(226,150,58,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: C.accent, fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🟡 {L("رسوم دراسة", "Frais cours")}</div>
                <div style={{ fontWeight: 800, color: C.ink }}>{DA(summary.currentFees)}</div>
                {(summary.currentFeesRemaining || 0) > 0 && <div style={{ fontSize: 10.5, color: "#f87171" }}>{DA(summary.currentFeesRemaining)} {L("متبقي", "restant")}</div>}
              </div>
              <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{L("المدفوع", "Total paye")}</div>
                <div style={{ fontWeight: 800, color: "#4ade80" }}>{DA(summary.totalPaid)}</div>
              </div>
              <div style={{ background: (summary.totalUnpaid || 0) > 0 ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)", border: `1px solid ${(summary.totalUnpaid || 0) > 0 ? "rgba(248,113,113,0.22)" : "rgba(74,222,128,0.22)"}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{L("المتبقي", "Restant")}</div>
                <div style={{ fontWeight: 800, color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80" }}>
                  {(summary.totalUnpaid || 0) > 0 ? DA(summary.totalUnpaid) : "0 DA"}
                </div>
              </div>
              {(summary.credit || 0) > 0 && (
                <div style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.22)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: "#c084fc", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{L("رصيد فائض", "Credit")}</div>
                  <div style={{ fontWeight: 800, color: "#c084fc" }}>+{DA(summary.credit)}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div style={{ background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)", borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{L("إجمالي الديون التراكمية", "TOTAL DETTE CUMULEE TOUTES ANNEES")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: grandTotalUnpaid > 0 ? "#f87171" : "#4ade80" }}>{DA(grandTotalUnpaid)}</div>
          </div>
          {grandTotalCredit > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{L("رصيد فائض إجمالي", "CREDIT GLOBAL")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#c084fc" }}>+{DA(grandTotalCredit)}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
