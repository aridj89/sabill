import React, { useState, useMemo, Component } from "react";
import {
  Landmark, Calendar, Users, TrendingUp, AlertCircle,
  CheckCircle2, ChevronDown, DollarSign, Clock, BarChart2,
  Filter, Search, Edit2, Save, X, Plus, History, ShieldCheck, RefreshCw
} from "lucide-react";
import { C, CAT_BY_ID, uid, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

const DA = (n) => {
  const val = Number(n) || 0;
  try {
    return `${val.toLocaleString()} DA`;
  } catch {
    return `${val} DA`;
  }
};

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

/* ─── Finance-Specific Error Boundary Component ───────────────────────────── */
class FinanceErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Finance Error Boundary captured an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: C.surface,
          border: `1.5px solid ${C.bad || "#f87171"}`,
          borderRadius: 20,
          padding: 36,
          textAlign: "center",
          margin: "24px 0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
        }}>
          <AlertCircle size={48} color={C.bad || "#f87171"} style={{ marginBottom: 14 }} />
          <h3 style={{ color: C.ink, fontSize: 20, fontWeight: 800, margin: 0 }}>
            Erreur d'affichage de la gestion financière
          </h3>
          <p style={{ color: C.inkSoft, fontSize: 13.5, marginTop: 8, maxWidth: 540, margin: "10px auto 20px", lineHeight: 1.5 }}>
            Une erreur inattendue est survenue lors du calcul ou du rendu des données financières.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: C.accent,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 24px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(226,150,58,0.4)"
            }}
          >
            <RefreshCw size={16} /> Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Stat Card Component ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, bg, border, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${border || C.border}`,
        borderRadius: 18, padding: "18px 20px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.18s ease",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = border || C.border)}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 15,
        background: bg, border: `1px solid ${border}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color, fontWeight: 700, marginTop: 3 }}>{sub}</div>}
        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Main Financial Content Component ───────────────────────────────────── */
function FinancialContent({ data, setData, toastFn, activeYearId, onNav }) {
  const { lang } = useLanguage();

  // Extract academicYears strictly with safe fallback
  const academicYears = useMemo(() => {
    const list = Array.isArray(data?.academicYears) && data.academicYears.length > 0
      ? data.academicYears
      : [{ id: "ay-2025-2026", name: "2025/2026", isCurrent: true }];
    return list;
  }, [data?.academicYears]);

  // Academic Year Selection state
  const [selectedYearId, setSelectedYearId] = useState(() => {
    if (activeYearId && academicYears.some(y => y && y.id === activeYearId)) return activeYearId;
    const current = academicYears.find(y => y && y.isCurrent);
    if (current?.id) return current.id;
    return academicYears[0]?.id || "ay-2025-2026";
  });

  // Sync selectedYearId if academicYears updates or selected ID is invalid
  React.useEffect(() => {
    if (!selectedYearId || !academicYears.some(y => y?.id === selectedYearId)) {
      const current = academicYears.find(y => y && y.isCurrent);
      setSelectedYearId(current?.id || academicYears[0]?.id || "ay-2025-2026");
    }
  }, [academicYears, selectedYearId]);

  const [searchQ, setSearchQ] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'enrolled' | 'historical' | 'unpaid'
  const [detailModalStudent, setDetailModalStudent] = useState(null);

  const currentYearObj = useMemo(() => {
    return academicYears.find(y => y && y.id === selectedYearId) || academicYears[0] || null;
  }, [academicYears, selectedYearId]);

  // ── 1. Calculate All Financial Metrics for Selected Academic Year ─────────────────
  const yearFinancials = useMemo(() => {
    const students = Array.isArray(data?.students) ? data.students : [];
    const enrollments = (Array.isArray(data?.enrollments) ? data.enrollments : []).filter(
      e => e && (e.academicYearId === selectedYearId || !e.academicYearId || !selectedYearId)
    );
    const payments = (Array.isArray(data?.payments) ? data.payments : []).filter(
      p => p && (p.academicYearId === selectedYearId || !p.academicYearId || !selectedYearId)
    );

    let totalEnrolled = enrollments.length;
    let totalMoneyReceived = 0;
    let totalPreviousDebt = 0;
    let totalCurrentFees = 0;
    let totalCurrentUnpaid = 0;
    let totalRegistrationFees = 0;
    let totalRegistrationPaid = 0;
    let totalRegistrationUnpaid = 0;
    let totalCreditGenerated = 0;
    let totalExpectedAll = 0;

    const studentSummaries = students.map(st => {
      if (!st || !st.id) return null;
      const summary = getStudentFinancialSummary(data, st.id, selectedYearId) || {};
      
      if (summary.isEnrolled) {
        totalPreviousDebt += Number(summary.previousDebt) || 0;
        totalCurrentFees += Number(summary.currentFees) || 0;
        totalRegistrationFees += Number(summary.registrationFeeAmount) || 0;
        totalRegistrationPaid += Number(summary.registrationFeePaid) || 0;
        totalRegistrationUnpaid += Number(summary.registrationFeeRemaining) || 0;
        totalMoneyReceived += Number(summary.totalPaid) || 0;
        totalCurrentUnpaid += Number(summary.totalUnpaid) || 0;
        totalCreditGenerated += Number(summary.credit) || 0;
        totalExpectedAll += Number(summary.totalExpected) || 0;
      }

      return {
        student: st,
        summary,
      };
    }).filter(Boolean);

    // Calculate Monthly breakdown based on actual payment dates
    const monthlyStats = MONTHS_KEYS.map(m => {
      const monthPayments = payments.filter(p => {
        if (!p) return false;
        const pDate = String(p.paidDate || p.date || "");
        return pDate.includes(`-${m.key}-`);
      });

      const received = monthPayments.reduce((acc, p) => acc + (Number(p?.paidAmount || p?.amount) || 0), 0);
      return {
        key: m.key,
        name: lang === "ar" ? m.ar : m.fr,
        received: isNaN(received) ? 0 : received,
        count: monthPayments.length,
      };
    });

    return {
      totalEnrolled,
      totalExpectedAll,
      totalMoneyReceived,
      totalPreviousDebt,
      totalCurrentFees,
      totalCurrentUnpaid,
      totalRegistrationFees,
      totalRegistrationPaid,
      totalRegistrationUnpaid,
      totalCreditGenerated,
      studentSummaries,
      monthlyStats,
    };
  }, [data, selectedYearId, lang]);

  // Filter student rows safely
  const filteredStudents = useMemo(() => {
    const list = Array.isArray(yearFinancials?.studentSummaries) ? yearFinancials.studentSummaries : [];
    return list.filter(item => {
      if (!item || !item.student || !item.summary) return false;
      const { student: st, summary } = item;

      if (filterGroup !== "all" && summary.group?.id !== filterGroup) return false;
      if (filterStatus === "enrolled" && !summary.isEnrolled) return false;
      if (filterStatus === "historical" && summary.isEnrolled) return false;
      if (filterStatus === "unpaid" && (summary.totalUnpaid || 0) === 0) return false;

      if (searchQ.trim()) {
        const q = searchQ.toLowerCase().trim();
        const fullName = `${st.prenom || ""} ${st.nom || ""}`.toLowerCase();
        const phone = String(st.phone || "").toLowerCase();
        const groupName = String(summary.group?.nom || "").toLowerCase();
        return fullName.includes(q) || phone.includes(q) || groupName.includes(q);
      }
      return true;
    });
  }, [yearFinancials, filterGroup, filterStatus, searchQ]);

  const groupsList = Array.isArray(data?.groups) ? data.groups : [];

  // Step 8: Safe Loading State
  if (!data) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: "center", color: C.inkSoft }}>
        <Clock size={32} color={C.accent} style={{ marginBottom: 12, animation: "spin 2s linear infinite" }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>
          {lang === "ar" ? "جاري تحميل البيانات المالية…" : "Chargement des données financières..."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Screen Header & Academic Year Selector ────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(226,150,58,0.2)", border: "1px solid rgba(226,150,58,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={20} color={C.accent} />
            </div>
            <h2 className="f-display" style={{ fontSize: 24, fontWeight: 800, color: C.ink, margin: 0 }}>
              {lang === "ar" ? "الإدارة المالية" : "Gestion Financière"}
            </h2>
          </div>
          <p style={{ color: C.inkSoft, fontSize: 13, margin: "4px 0 0" }}>
            {lang === "ar" ? "تحليل الدخل، الديون، حقوق التسجيل والائتمان حسب السنة الدراسية" : "Analyse des revenus, dettes, frais d'inscription et crédits par année scolaire"}
          </p>
        </div>

        {/* Academic Year Selector Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1.5px solid ${C.accent}`, borderRadius: 14, padding: "8px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          <Calendar size={16} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
            {lang === "ar" ? "السنة الدراسية:" : "Année Scolaire:"}
          </span>
          <select
            value={selectedYearId}
            onChange={e => setSelectedYearId(e.target.value)}
            style={{
              background: "transparent", border: "none", color: "#fff",
              fontSize: 14, fontWeight: 800, outline: "none", cursor: "pointer", colorScheme: "dark"
            }}
          >
            {academicYears.map(y => (
              <option key={y?.id || Math.random()} value={y?.id}>
                {y?.name} {y?.isCurrent ? (lang === "ar" ? "(الحالية)" : "(Actuelle)") : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Yearly Financial Dashboard Stat Cards ──────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard
          icon={Users}
          label={lang === "ar" ? "التلاميذ المسجلون" : "Élèves inscrits cette année"}
          value={yearFinancials.totalEnrolled}
          sub={currentYearObj?.name ? `${currentYearObj.name}` : ""}
          color="#818cf8" bg="rgba(129,140,248,0.15)" border="rgba(129,140,248,0.35)"
        />
        <StatCard
          icon={Landmark}
          label={lang === "ar" ? "إجمالي المتوقع (Total Attendu)" : "Total Attendu (Prévu)"}
          value={DA(yearFinancials.totalExpectedAll)}
          sub={lang === "ar" ? "رسوم الدراسة + التسجيل + الديون" : "Frais d'études + Inscription + Dettes"}
          color="#a78bfa" bg="rgba(167,139,250,0.15)" border="rgba(167,139,250,0.35)"
        />
        <StatCard
          icon={TrendingUp}
          label={lang === "ar" ? "إجمالي التحصيل (Total Encaissé)" : "Total Encaissé (Perçu)"}
          value={DA(yearFinancials.totalMoneyReceived)}
          sub={lang === "ar" ? "المبالغ المحصلة فعلياً" : "Montants effectivement perçus"}
          color="#4ade80" bg="rgba(74,222,128,0.15)" border="rgba(74,222,128,0.35)"
        />
        <StatCard
          icon={Clock}
          label={lang === "ar" ? "إجمالي المتبقي (Total Restant)" : "Total Restant (Impayé)"}
          value={DA(yearFinancials.totalCurrentUnpaid)}
          sub={lang === "ar" ? "المستحقات غير المسددة" : "Montants restant à payer"}
          color="#fbbf24" bg="rgba(251,191,36,0.15)" border="rgba(251,191,36,0.35)"
        />
        <StatCard
          icon={ShieldCheck}
          label={lang === "ar" ? "حقوق التسجيل المتبقية" : "Frais d'inscription restants"}
          value={DA(yearFinancials.totalRegistrationUnpaid)}
          sub={`${lang === "ar" ? "المحصل:" : "Payés:"} ${DA(yearFinancials.totalRegistrationPaid)}`}
          color="#3b82f6" bg="rgba(59,130,246,0.15)" border="rgba(59,130,246,0.35)"
        />
        <StatCard
          icon={DollarSign}
          label={lang === "ar" ? "الرصيد الفائض (Credit)" : "Crédits générés (Surplus)"}
          value={DA(yearFinancials.totalCreditGenerated)}
          sub={lang === "ar" ? "مدفوعات زائدة محفوظة للتلميذ" : "Surplus conservé en crédit"}
          color="#c084fc" bg="rgba(192,132,252,0.15)" border="rgba(192,132,252,0.35)"
        />
      </div>

      {/* ── Monthly Financial Dashboard (Actual Payments Received) ───────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, marginBottom: 28, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={18} color={C.accent} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.ink }}>
              {lang === "ar" ? `التحصيل المالي الشهري ${currentYearObj?.name ? `لـ ${currentYearObj.name}` : ""}` : `Recettes Mensuelles ${currentYearObj?.name ? `— ${currentYearObj.name}` : ""}`}
            </h3>
          </div>
          <span style={{ fontSize: 12, color: C.inkSoft }}>
            {lang === "ar" ? "بناءً على تواريخ الدفع الفعلية" : "Basé sur les dates réelles de paiement"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {yearFinancials.monthlyStats.map(m => (
            <div key={m.key} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${m.received > 0 ? "rgba(74,222,128,0.3)" : C.border}`, borderRadius: 14, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, textTransform: "uppercase" }}>{m.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: m.received > 0 ? "#4ade80" : C.ink, margin: "6px 0 2px" }}>{DA(m.received)}</div>
              <div style={{ fontSize: 10.5, color: C.inkSoft }}>{m.count} {lang === "ar" ? "عملية دفع" : "paiement(s)"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Student Finance Table & Search ───────────────────────────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <h3 className="f-display" style={{ margin: 0, fontSize: 18, color: C.ink, fontWeight: 800 }}>
            {lang === "ar" ? "جدول المستحقات المالية للتلاميذ" : "Bilan financier des élèves"}
          </h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px", color: C.ink, fontSize: 13, outline: "none", colorScheme: "dark" }}
            >
              <option value="all">{lang === "ar" ? "جميع التلاميذ" : "Tous les élèves"}</option>
              <option value="enrolled">{lang === "ar" ? "المسجلون هذه السنة فقط" : "Inscrits cette année فقط"}</option>
              <option value="historical">{lang === "ar" ? "غير المسجلين (أرشيف)" : "Non inscrits cette année"}</option>
              <option value="unpaid">{lang === "ar" ? "عليهم ديون فقط" : "Avec dettes uniquement"}</option>
            </select>

            {/* Filter Group */}
            <select
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
              style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px", color: C.ink, fontSize: 13, outline: "none", colorScheme: "dark" }}
            >
              <option value="all">{lang === "ar" ? "كل الأفواج" : "Tous les groupes"}</option>
              {groupsList.map(g => <option key={g?.id || Math.random()} value={g?.id}>{g?.nom}</option>)}
            </select>

            {/* Search Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px" }}>
              <Search size={14} color={C.inkSoft} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={lang === "ar" ? "بحث باسم التلميذ…" : "Rechercher..."}
                style={{ background: "transparent", border: "none", color: C.ink, fontSize: 13, outline: "none", width: 140 }}
              />
            </div>
          </div>
        </div>

        {/* Table list */}
        <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${C.border}`, textAlign: "left" }}>
                <th style={{ padding: "12px 14px", color: C.inkSoft }}>{lang === "ar" ? "التلميذ" : "Élève"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "الفوج" : "Groupe"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "حقوق التسجيل" : "Frais Inscription"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "الديون السابقة" : "Dette Précédente"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "رسوم السنة" : "Frais Année"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "المدفوع" : "Total Payé"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "المتبقي / الديون" : "Reste à Payer"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "الرصيد الفائض" : "Crédit"}</th>
                <th style={{ padding: "12px 14px", color: C.inkSoft, textAlign: "center" }}>{lang === "ar" ? "التفاصيل" : "Détails"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 30, textAlign: "center", color: C.inkSoft }}>
                    {lang === "ar" ? "لا توجد بيانات مالية متاحة لهذه السنة" : "Aucune donnée financière disponible pour cette année."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map(({ student: st, summary }) => {
                  if (!st || !summary) return null;
                  const regStatusColor = summary.registrationFeeStatus === "PAYÉ" ? "#4ade80" : summary.registrationFeeStatus === "PARTIELLEMENT PAYÉ" ? "#fbbf24" : "#f87171";

                  return (
                    <tr
                      key={st.id}
                      onClick={() => setDetailModalStudent(st)}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Name & Enrollment warning */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, color: C.ink }}>{st.prenom} {st.nom}</div>
                        {!summary.isEnrolled ? (
                          <span style={{ fontSize: 10.5, color: C.inkSoft, fontStyle: "italic", background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>
                            {lang === "ar" ? "غير مسجل هذه السنة" : "Non inscrit cette année"}
                          </span>
                        ) : (summary.previousDebt || 0) > 0 ? (
                          <span style={{ fontSize: 10.5, color: "#f87171", fontWeight: 700, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", padding: "1px 6px", borderRadius: 4, display: "inline-block", marginTop: 2 }}>
                            🔴 {lang === "ar" ? "دين سابق:" : "Dette préc:"} {DA(summary.previousDebt)}
                          </span>
                        ) : null}
                      </td>

                      {/* Group */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: C.inkSoft }}>
                        {summary.group ? summary.group.nom : "—"}
                      </td>

                      {/* Registration fee */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: regStatusColor, background: `${regStatusColor}20`, padding: "2px 8px", borderRadius: 6 }}>
                          {summary.registrationFeeStatus || "NON PAYÉ"} ({DA(summary.registrationFeePaid)})
                        </span>
                      </td>

                      {/* Previous debt */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: (summary.previousDebt || 0) > 0 ? "#f87171" : C.inkSoft, fontWeight: (summary.previousDebt || 0) > 0 ? 700 : 400 }}>
                        {DA(summary.previousDebt)}
                      </td>

                      {/* Current fees */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: C.inkSoft, fontWeight: 600 }}>
                        {DA(summary.currentFees)}
                      </td>

                      {/* Paid */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "#4ade80", fontWeight: 700 }}>
                        {DA(summary.totalPaid)}
                      </td>

                      {/* Unpaid debt */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80", fontWeight: (summary.totalUnpaid || 0) > 0 ? 800 : 600 }}>
                        {(summary.totalUnpaid || 0) > 0 ? DA(summary.totalUnpaid) : "✓ 0 DA"}
                      </td>

                      {/* Credit */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: (summary.credit || 0) > 0 ? "#c084fc" : C.inkSoft, fontWeight: (summary.credit || 0) > 0 ? 800 : 400 }}>
                        {(summary.credit || 0) > 0 ? `+${DA(summary.credit)}` : "—"}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setDetailModalStudent(st); }}
                          style={{ background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)", borderRadius: 8, padding: "4px 10px", color: C.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                        >
                          <History size={12} style={{ display: "inline", marginRight: 4 }} />
                          {lang === "ar" ? "التفاصيل" : "Détails"}
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

      {/* ── Student Year-by-Year Financial History Modal ────────────────────────────── */}
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

/* ─── Export FinancialScreen wrapped in Error Boundary ───────────────────── */
export default function FinancialScreen(props) {
  return (
    <FinanceErrorBoundary>
      <FinancialContent {...props} />
    </FinanceErrorBoundary>
  );
}

/* ─── Student Financial History Modal ─────────────────────────────────────── */
function StudentFinancialHistoryModal({ student, data, onClose }) {
  const { lang } = useLanguage();
  if (!student) return null;

  const academicYears = Array.isArray(data?.academicYears) ? data.academicYears : [];

  const histories = academicYears.map(y => {
    if (!y) return null;
    const summary = getStudentFinancialSummary(data, student.id, y.id) || {};
    return {
      year: y,
      summary,
    };
  }).filter(Boolean);

  const grandTotalUnpaid = histories.reduce((acc, h) => acc + (Number(h?.summary?.totalUnpaid) || 0), 0);
  const grandTotalCredit = histories.reduce((acc, h) => acc + (Number(h?.summary?.credit) || 0), 0);

  return (
    <Modal title={`${lang === "ar" ? "السجل المالي المفصل:" : "Détail Financier:"} ${student.prenom || ""} ${student.nom || ""}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {histories.map(({ year, summary }) => (
          <div key={year?.id || Math.random()} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.1)", pb: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>
                🗓️ {lang === "ar" ? "السنة الدراسية" : "Année Scolaire"} {year?.name}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: summary.isEnrolled ? "#4ade80" : C.inkSoft }}>
                {summary.isEnrolled ? (lang === "ar" ? "مسجل (فوج: " + (summary.group?.nom || "عام") + ")" : "Inscrit (" + (summary.group?.nom || "Général") + ")") : (lang === "ar" ? "غير مسجل" : "Non inscrit")}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, fontSize: 12.5 }}>
              <div>
                <span style={{ color: C.inkSoft }}>{lang === "ar" ? "حقوق التسجيل:" : "Frais d'inscription:"}</span>
                <div style={{ fontWeight: 700, color: C.ink }}>{DA(summary.registrationFeeAmount)} ({summary.registrationFeeStatus || "NON PAYÉ"})</div>
              </div>

              <div>
                <span style={{ color: C.inkSoft }}>{lang === "ar" ? "رسوم الدراسة:" : "Frais de cours:"}</span>
                <div style={{ fontWeight: 700, color: C.ink }}>{DA(summary.currentFees)}</div>
              </div>

              <div>
                <span style={{ color: C.inkSoft }}>{lang === "ar" ? "ديون سابقة مرحلة:" : "Dette antérieure:"}</span>
                <div style={{ fontWeight: 700, color: (summary.previousDebt || 0) > 0 ? "#f87171" : C.ink }}>{DA(summary.previousDebt)}</div>
              </div>

              <div>
                <span style={{ color: C.inkSoft }}>{lang === "ar" ? "المبلغ المدفوع:" : "Total payé:"}</span>
                <div style={{ fontWeight: 700, color: "#4ade80" }}>{DA(summary.totalPaid)}</div>
              </div>

              <div>
                <span style={{ color: C.inkSoft }}>{lang === "ar" ? "الديون المتبقية:" : "Dette restante:"}</span>
                <div style={{ fontWeight: 800, color: (summary.totalUnpaid || 0) > 0 ? "#f87171" : "#4ade80" }}>{DA(summary.totalUnpaid)}</div>
              </div>

              <div>
                <span style={{ color: C.inkSoft }}>{lang === "ar" ? "الرصيد الفائض (Crédit):" : "Crédit généré:"}</span>
                <div style={{ fontWeight: 800, color: (summary.credit || 0) > 0 ? "#c084fc" : C.inkSoft }}>{(summary.credit || 0) > 0 ? `+${DA(summary.credit)}` : "0 DA"}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Overall Total Summary */}
        <div style={{ background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)", borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{lang === "ar" ? "إجمالي الديون التراكمية عبر كل السنوات" : "TOTAL DETTE CUMULÉE TOUTES ANNÉES"}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: grandTotalUnpaid > 0 ? "#f87171" : "#4ade80" }}>{DA(grandTotalUnpaid)}</div>
          </div>
          {grandTotalCredit > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{lang === "ar" ? "إجمالي الرصيد الفائض المحفوظ" : "CRÉDIT GLOBAL DISPONIBLE"}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#c084fc" }}>+{DA(grandTotalCredit)}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

