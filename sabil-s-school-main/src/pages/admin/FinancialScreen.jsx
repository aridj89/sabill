import React, { useState, useMemo } from "react";
import {
  Landmark, Calendar, Users, TrendingUp, AlertCircle,
  CheckCircle2, ChevronDown, DollarSign, Clock, BarChart2,
  Filter, Search, Edit2, Save, X, Plus,
} from "lucide-react";
import { C, CAT_BY_ID, uid, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import { notifyPaymentReceived } from "../../utils/notificationEngine";

/* ─── helpers ──────────────────────────────────────────────── */
const DA = (n) => `${(n || 0).toLocaleString("fr-DZ")} DA`;
const months_fr = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const months_ar = ["جان","فيف","مار","أفر","ماي","جوان","جويل","أوت","سبت","أكت","نوف","ديس"];

function fmtMonth(yyyymm, lang) {
  const [y, m] = yyyymm.split("-");
  const mName = lang === "ar" ? months_ar[+m - 1] : months_fr[+m - 1];
  return `${mName} ${y}`;
}

/* ─── Stat Card ─────────────────────────────────────────────── */
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
        <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color, fontWeight: 700, marginTop: 2 }}>{sub}</div>}
        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Mini Bar Chart ────────────────────────────────────────── */
function MiniBarChart({ data: chartData, lang }) {
  if (!chartData || chartData.length === 0) return null;
  const maxVal = Math.max(...chartData.map(d => d.expected), 1);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
      padding: "20px 24px", marginBottom: 28,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 18 }}>
        {lang === "ar" ? "مقارنة الدخل الشهري" : "Comparaison revenus mensuels"}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 100, overflowX: "auto" }}>
        {chartData.map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 52 }}>
            <div style={{ width: "100%", display: "flex", gap: 3, alignItems: "flex-end", height: 80 }}>
              {/* Expected */}
              <div style={{
                flex: 1, borderRadius: "4px 4px 0 0",
                background: "rgba(99,102,241,0.35)",
                border: "1px solid rgba(99,102,241,0.5)",
                height: `${(d.expected / maxVal) * 100}%`,
                minHeight: 4,
                transition: "height 0.4s ease",
              }} title={`${lang === "ar" ? "متوقع" : "Attendu"}: ${DA(d.expected)}`} />
              {/* Paid */}
              <div style={{
                flex: 1, borderRadius: "4px 4px 0 0",
                background: "rgba(74,222,128,0.5)",
                border: "1px solid rgba(74,222,128,0.65)",
                height: `${(d.paid / maxVal) * 100}%`,
                minHeight: d.paid > 0 ? 4 : 0,
                transition: "height 0.4s ease",
              }} title={`${lang === "ar" ? "محصل" : "Encaissé"}: ${DA(d.paid)}`} />
            </div>
            <div style={{ fontSize: 10.5, color: C.inkSoft, textAlign: "center", whiteSpace: "nowrap" }}>
              {fmtMonth(d.month, lang)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(99,102,241,0.85)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(99,102,241,0.5)", display: "inline-block" }} />
          {lang === "ar" ? "متوقع" : "Attendu"}
        </span>
        <span style={{ fontSize: 11, color: "rgba(74,222,128,0.9)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(74,222,128,0.5)", display: "inline-block" }} />
          {lang === "ar" ? "محصل" : "Encaissé"}
        </span>
      </div>
    </div>
  );
}

/* ─── Payment edit modal ────────────────────────────────────── */
function PaymentEditModal({ student, group, payment, selectedMonth, onClose, onSave, data, activeYearId }) {
  const { lang } = useLanguage();
  const fin = getStudentFinancialSummary(data, student.id, activeYearId);
  const expectedAmount = student.monthlyPrice || student.montant || 0;
  
  const [paymentType, setPaymentType] = useState(payment?.type === "debt" ? "debt" : "normal");

  const [status, setStatus] = useState(payment?.status || "unpaid");
  const [paidAmount, setPaidAmount] = useState(payment?.paidAmount ?? (payment?.status === "paid" ? expectedAmount : 0));
  const [paidDate, setPaidDate] = useState(payment?.paidDate || new Date().toISOString().slice(0, 10));

  const handleSave = () => {
    const finalPaid = status === "paid" ? expectedAmount : status === "partial" ? Number(paidAmount) : 0;
    onSave({
      id: payment?.id || uid(),
      studentId: student.id,
      groupId: group.id,
      month: selectedMonth,
      expectedAmount: paymentType === "debt" ? fin.previousDebtRemaining : expectedAmount,
      paidAmount: finalPaid,
      status,
      type: paymentType,
      paidDate: status !== "unpaid" ? paidDate : null,
    });
  };

  const statusOptions = [
    { value: "paid",    label: lang === "ar" ? "مدفوع ✓"   : "Payé ✓",     color: "#4ade80", bg: "rgba(74,222,128,0.15)",  border: "rgba(74,222,128,0.4)"  },
    { value: "partial", label: lang === "ar" ? "جزئي ○"    : "Partiel ○",  color: C.accent,  bg: "rgba(226,150,58,0.15)", border: "rgba(226,150,58,0.4)"  },
    { value: "unpaid",  label: lang === "ar" ? "غير مدفوع ✗" : "Impayé ✗",  color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.4)" },
  ];

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${C.border}`, fontSize: 14, color: C.ink,
    outline: "none", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)",
    boxSizing: "border-box",
  };

  return (
    <Modal
      title={lang === "ar" ? `تسجيل دفع — ${student.prenom} ${student.nom}` : `Paiement — ${student.prenom} ${student.nom}`}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 16 }}>
        {/* Payment Type */}
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
            {lang === "ar" ? "نوع الدفع" : "Type de paiement"}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setPaymentType("normal"); setPaidAmount(expectedAmount); setStatus("paid"); }}
              style={{
                flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${paymentType === "normal" ? "#818cf8" : "rgba(255,255,255,0.15)"}`,
                background: paymentType === "normal" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                color: paymentType === "normal" ? "#818cf8" : "rgba(255,255,255,0.5)", cursor: "pointer"
              }}
            >
              {lang === "ar" ? "دفع هذه السنة" : "Paiement cette année"}
            </button>
            <button
              onClick={() => { setPaymentType("debt"); setPaidAmount(fin.previousDebtRemaining); setStatus("paid"); }}
              style={{
                flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${paymentType === "debt" ? "#f87171" : "rgba(255,255,255,0.15)"}`,
                background: paymentType === "debt" ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.04)",
                color: paymentType === "debt" ? "#f87171" : "rgba(255,255,255,0.5)", cursor: "pointer"
              }}
            >
              {lang === "ar" ? "تسديد ديون" : "Paiement dettes"}
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}>
          {paymentType === "normal" ? (
            <>
              <div style={{ fontSize: 12, color: C.inkSoft }}>{lang === "ar" ? "الشهر" : "Mois"}: <strong style={{ color: C.ink }}>{fmtMonth(selectedMonth, lang)}</strong></div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>{lang === "ar" ? "السعر الشهري" : "Mensualité"}: <strong style={{ color: C.accent }}>{DA(expectedAmount)}</strong></div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.inkSoft }}>{lang === "ar" ? "الديون السابقة" : "Dettes précédentes"}: <strong style={{ color: "#f87171" }}>{DA(fin.previousDebtRemaining)}</strong></div>
            </>
          )}
        </div>

        {/* Status selector */}
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
            {lang === "ar" ? "حالة الدفع" : "Statut du paiement"}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatus(opt.value);
                  if (opt.value === "paid") setPaidAmount(expectedAmount);
                  if (opt.value === "unpaid") setPaidAmount(0);
                }}
                style={{
                  flex: 1, padding: "8px 6px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${status === opt.value ? opt.border : "rgba(255,255,255,0.15)"}`,
                  background: status === opt.value ? opt.bg : "rgba(255,255,255,0.04)",
                  color: status === opt.value ? opt.color : "rgba(255,255,255,0.5)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount paid (for partial) */}
        {status === "partial" && (
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
              {lang === "ar" ? "المبلغ المدفوع (DA)" : "Montant payé (DA)"}
            </label>
            <input
              type="number"
              value={paidAmount}
              min={0}
              max={paymentType === "debt" ? fin.previousDebtRemaining : expectedAmount}
              onChange={e => setPaidAmount(e.target.value)}
              style={inputStyle}
            />
            <div style={{ fontSize: 11.5, color: C.accent, marginTop: 6, fontWeight: 600 }}>
              {lang === "ar" ? "المتبقي" : "Reste"}: {DA((paymentType === "debt" ? fin.previousDebtRemaining : expectedAmount) - Number(paidAmount))}
            </div>
          </div>
        )}

        {/* Payment date */}
        {status !== "unpaid" && (
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
              {lang === "ar" ? "تاريخ الدفع" : "Date du paiement"}
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        <PrimaryBtn full onClick={handleSave}>
          <Save size={15} />
          {lang === "ar" ? "حفظ الدفع" : "Enregistrer le paiement"}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

/* ─── Main FinancialScreen ──────────────────────────────────── */
export default function FinancialScreen({ data, setData, toastFn, onNav, activeYearId }) {
  const { lang, t } = useLanguage();

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [filterGroup, setFilterGroup] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [editPayment, setEditPayment] = useState(null); // { student, group, payment }

  // ── Compute all months that have data ────────────────────────
  const allMonths = useMemo(() => {
    const months = new Set();
    (data.payments || []).forEach(p => { if (p.month) months.add(p.month); });
    // always include last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.add(d.toISOString().slice(0, 7));
    }
    return [...months].sort();
  }, [data.payments]);

  // ── Main stats for selected month ────────────────────────────
  const stats = useMemo(() => {
    let expectedIncome = 0;
    let paidIncome = 0;
    let unpaidIncome = 0;
    let paidStudentsCount = 0;
    let unpaidStudentsCount = 0;
    let partialStudentsCount = 0;
    let totalStudents = 0;
    let doneSessions = 0;
    let extraIncome = 0;
    let totalDebtExpected = 0;
    let totalDebtPaid = 0;

    data.students.forEach(st => {
      const fin = getStudentFinancialSummary(data, st.id, activeYearId);
      if (fin.previousDebtTotal > 0) {
        totalDebtExpected += fin.previousDebtTotal;
        totalDebtPaid += fin.previousDebtPaid;
        totalDebtUnpaid += fin.previousDebtRemaining;
      }
    });

    const sgFilter = filterGroup === "all" ? data.groups : data.groups.filter(sg => sg.id === filterGroup);

    sgFilter.forEach(sg => {
      // Find students enrolled in this group for the active year
      const sgStudents = data.students.filter(s => {
        const en = (data.enrollments || []).find(e => e.studentId === s.id && e.academicYearId === activeYearId);
        return en && en.groupId === sg.id;
      });
      
      expectedIncome += sgStudents.reduce((sum, st) => {
        const en = (data.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
        return sum + (en ? (en.monthlyPrice || 0) : 0);
      }, 0);
      
      totalStudents += sgStudents.length;
      doneSessions += (data.sessions || []).filter(s => s.groupId === sg.id && s.date.startsWith(selectedMonth) && s.status === "done").length;

      sgStudents.forEach(st => {
        const en = (data.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
        const stPrice = en ? (en.monthlyPrice || 0) : 0;
        const pmt = data.payments.find(p => p.studentId === st.id && p.groupId === sg.id && p.month === selectedMonth && (p.academicYearId === activeYearId || !p.academicYearId));
        if (!pmt || pmt.status === "unpaid") {
          unpaidIncome += stPrice;
          unpaidStudentsCount++;
        } else if (pmt.status === "paid") {
          paidIncome += pmt.expectedAmount || stPrice;
          paidStudentsCount++;
        } else if (pmt.status === "partial") {
          paidIncome += pmt.paidAmount || 0;
          unpaidIncome += (pmt.expectedAmount || stPrice) - (pmt.paidAmount || 0);
          partialStudentsCount++;
          unpaidStudentsCount++;
        }
      });
    });

    // Extra sessions
    (data.extraSessions || []).filter(es => es.date.startsWith(selectedMonth)).forEach(es => {
      if (!filterGroup || filterGroup === "all" || es.groupId === filterGroup) {
        if (es.isGroupPrice) {
          extraIncome += es.price || 0;
        } else {
          const attendances = (data.attendances || []).filter(a => a.sessionId === es.id && a.present);
          extraIncome += attendances.length * (es.price || 0);
        }
      }
    });

    // Debt Payments and other generic payments in this month (already tracked in totalDebtPaid globally, but for monthly charting)
    let debtIncome = 0;
    (data.payments || []).filter(p => p.month === selectedMonth && p.type === "debt" && (p.academicYearId === activeYearId || !p.academicYearId)).forEach(p => {
      debtIncome += (p.paidAmount || p.amount || 0);
    });

    const collectionRate = expectedIncome > 0 ? Math.round((paidIncome / expectedIncome) * 100) : 0;

    return {
      expectedIncome, paidIncome, unpaidIncome,
      paidStudentsCount, unpaidStudentsCount, partialStudentsCount,
      totalStudents, doneSessions, extraIncome, debtIncome,
      totalCollected: paidIncome + extraIncome,
      totalExpected: expectedIncome + extraIncome,
      collectionRate,
      totalDebtExpected, totalDebtPaid, totalDebtUnpaid,
      totalGroups: data.groups.length,
    };
  }, [data, selectedMonth, filterGroup, activeYearId]);

  // ── Chart data (last 6 months) ───────────────────────────────
  const chartData = useMemo(() => {
    return allMonths.slice(-6).map(month => {
      let expected = 0, paid = 0;
      data.groups.forEach(sg => {
        const sgStudents = data.students.filter(s => {
          const en = (data.enrollments || []).find(e => e.studentId === s.id && e.academicYearId === activeYearId);
          return en && en.groupId === sg.id;
        });
        expected += sgStudents.reduce((sum, st) => {
          const en = (data.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
          return sum + (en ? (en.monthlyPrice || 0) : 0);
        }, 0);
        sgStudents.forEach(st => {
          const en = (data.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
          const stPrice = en ? (en.monthlyPrice || 0) : 0;
          const pmt = data.payments.find(p => p.studentId === st.id && p.groupId === sg.id && p.month === month && (p.academicYearId === activeYearId || !p.academicYearId));
          if (pmt?.status === "paid") paid += pmt.expectedAmount || stPrice;
          else if (pmt?.status === "partial") paid += pmt.paidAmount || 0;
        });
      });
      // Add debt payments
      (data.payments || []).filter(p => p.month === month && p.type === "debt").forEach(p => {
        paid += (p.paidAmount || p.amount || 0);
      });
      return { month, expected, paid };
    });
  }, [data, allMonths, activeYearId]);

  // ── Student list for payment table ───────────────────────────
  const studentRows = useMemo(() => {
    const sgFilter = filterGroup === "all" ? data.groups : data.groups.filter(sg => sg.id === filterGroup);
    const rows = [];
    sgFilter.forEach(sg => {
      const sgStudents = data.students.filter(s => {
        const en = (data.enrollments || []).find(e => e.studentId === s.id && e.academicYearId === activeYearId);
        return en && en.groupId === sg.id;
      });
      sgStudents.forEach(st => {
        const pmt = data.payments.find(p => p.studentId === st.id && p.groupId === sg.id && p.month === selectedMonth && (p.academicYearId === activeYearId || !p.academicYearId));
        const name = `${st.prenom} ${st.nom}`.toLowerCase();
        if (searchQ && !name.includes(searchQ.toLowerCase())) return;
        rows.push({ student: st, group: sg, payment: pmt });
      });
    });
    return rows;
  }, [data, filterGroup, selectedMonth, searchQ, activeYearId]);

  // ── Save payment ─────────────────────────────────────────────
  const handleSavePayment = (pmtData) => {
    const pmtToSave = { ...pmtData, academicYearId: activeYearId };
    setData(d => {
      const existing = d.payments.find(p => p.id === pmtToSave.id);
      const newPayments = existing
        ? d.payments.map(p => p.id === pmtToSave.id ? pmtToSave : p)
        : [...d.payments, pmtToSave];
      
      let nextNotifs = d.userNotifications || [];
      if (pmtToSave.status === "paid" || (pmtToSave.status === "partial" && pmtToSave.paidAmount > 0)) {
        const amount = pmtToSave.status === "paid" ? (pmtToSave.expectedAmount || pmtToSave.paidAmount) : pmtToSave.paidAmount;
        nextNotifs = notifyPaymentReceived(d, pmtToSave.studentId, amount, {
          type: "course",
          groupId: pmtToSave.groupId,
          month: pmtToSave.month
        }, lang);
      }

      return { ...d, payments: newPayments, userNotifications: nextNotifs };
    });
    setEditPayment(null);
    if (toastFn) toastFn(lang === "ar" ? "تم حفظ الدفع وإشعار التلميذ ✓" : "Paiement enregistré & élève notifié ✓");
  };

  // ── Quick mark all as paid ───────────────────────────────────
  const markAllPaid = (sgId) => {
    const sg = data.groups.find(s => s.id === sgId);
    if (!sg) return;
    const sgStudents = data.students.filter(s => {
      const en = (data.enrollments || []).find(e => e.studentId === s.id && e.academicYearId === activeYearId);
      return en && en.groupId === sgId;
    });
    setData(d => {
      let payments = [...d.payments];
      let notifs = d.userNotifications || [];
      sgStudents.forEach(st => {
        const en = (d.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
        const stPrice = en ? (en.monthlyPrice || 0) : 0;
        const idx = payments.findIndex(p => p.studentId === st.id && p.groupId === sgId && p.month === selectedMonth && (p.academicYearId === activeYearId || !p.academicYearId));
        const pmt = {
          id: idx >= 0 ? payments[idx].id : uid(),
          studentId: st.id, groupId: sgId, month: selectedMonth,
          expectedAmount: stPrice, paidAmount: stPrice,
          status: "paid", paidDate: new Date().toISOString().slice(0, 10),
          academicYearId: activeYearId,
        };
        if (idx >= 0) payments[idx] = pmt;
        else payments.push(pmt);

        notifs = notifyPaymentReceived({ ...d, userNotifications: notifs }, st.id, stPrice, {
          type: "course",
          groupId: sgId,
          month: selectedMonth
        }, lang);
      });
      return { ...d, payments, userNotifications: notifs };
    });
    if (toastFn) toastFn(lang === "ar" ? "تم تأكيد دفع الجميع وإرسال الإشعارات ✓" : "Tous marqués payés & élèves notifiés ✓");
  };

  const statusPill = (pmt, price) => {
    if (!pmt || pmt.status === "unpaid") return { label: lang === "ar" ? "غير مدفوع" : "Impayé", color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.4)" };
    if (pmt.status === "paid") return { label: lang === "ar" ? "مدفوع" : "Payé", color: "#4ade80", bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)" };
    return { label: lang === "ar" ? "جزئي" : "Partiel", color: C.accent, bg: "rgba(226,150,58,0.15)", border: "rgba(226,150,58,0.4)" };
  };

  const sgOptions = data.groups.filter(sg => sg.academicYearId === activeYearId);

  const thStyle = {
    textAlign: "left", padding: "12px 14px",
    color: C.inkSoft, fontWeight: 700,
    borderBottom: `1px solid ${C.border}`,
    background: "rgba(255,255,255,0.03)",
    whiteSpace: "nowrap", fontSize: 12.5,
  };

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 className="f-display" style={{ fontSize: 28, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: "-0.02em" }}>
            {lang === "ar" ? "💰 لوحة القيادة المالية" : "💰 Tableau de Bord Financier"}
          </h2>
          <p style={{ color: C.inkSoft, fontSize: 13.5, margin: "6px 0 0" }}>
            {lang === "ar" ? "متابعة الدخل والمدفوعات والإحصائيات الشهرية" : "Suivi des revenus, paiements et statistiques mensuelles"}
          </p>
        </div>

        {/* Month picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 14px" }}>
          <Calendar size={16} color={C.accent} />
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ background: "transparent", border: "none", color: C.ink, fontSize: 14, fontWeight: 700, outline: "none", colorScheme: "dark" }}
          />
        </div>
      </div>

      {/* ── KPI Cards: PAIEMENT CETTE ANNÉE ───────────────────── */}
      <h3 className="f-display" style={{ margin: "0 0 16px", fontSize: 18, color: C.ink, fontWeight: 700 }}>
        {lang === "ar" ? "أ. مدفوعات هذه السنة" : "A. Paiements cette année"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={Landmark} label={lang === "ar" ? "إجمالي المحصل (سنة حالية)" : "Encaissé (année)"} value={DA(stats.totalCollected)}
          sub={`${stats.collectionRate}%`} color="#4ade80" bg="rgba(74,222,128,0.18)" border="rgba(74,222,128,0.35)" />
        <StatCard icon={TrendingUp} label={lang === "ar" ? "الدخل المتوقع (سنة حالية)" : "Attendu (année)"} value={DA(stats.totalExpected)}
          color="#818cf8" bg="rgba(99,102,241,0.2)" border="rgba(99,102,241,0.35)" />
        <StatCard icon={CheckCircle2} label={lang === "ar" ? "تلاميذ دفعوا" : "Élèves payés"} value={stats.paidStudentsCount}
          color="#4ade80" bg="rgba(74,222,128,0.1)" border="rgba(74,222,128,0.25)" />
        <StatCard icon={Users} label={lang === "ar" ? "إجمالي التلاميذ (انقر للعرض)" : "Total élèves (cliquer)"} value={stats.totalStudents}
          color="#818cf8" bg="rgba(99,102,241,0.12)" border="rgba(99,102,241,0.28)"
          onClick={() => onNav && onNav({ screen: "parents" })} />
      </div>

      {/* ── KPI Cards: PAIEMENT DETTES ──────────────────────── */}
      <h3 className="f-display" style={{ margin: "0 0 16px", fontSize: 18, color: C.ink, fontWeight: 700 }}>
        {lang === "ar" ? "ب. مدفوعات الديون السابقة" : "B. Paiements dettes précédentes"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={DollarSign} label={lang === "ar" ? "ديون سابقة مسددة" : "Dettes encaissées"} value={DA(stats.totalDebtPaid)}
          color={C.accent} bg="rgba(226,150,58,0.15)" border="rgba(226,150,58,0.35)" />
        <StatCard icon={AlertCircle} label={lang === "ar" ? "إجمالي الديون (تاريخي)" : "Total Dettes"} value={DA(stats.totalDebtExpected)}
          color="#f87171" bg="rgba(248,113,113,0.12)" border="rgba(248,113,113,0.28)" />
        <StatCard icon={AlertCircle} label={lang === "ar" ? "الديون غير المسددة" : "Dettes Impayées"} value={DA(stats.totalDebtUnpaid)}
          color="#f87171" bg="rgba(248,113,113,0.18)" border="rgba(248,113,113,0.35)"
          onClick={() => onNav && onNav({ screen: "debts" })} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={CheckCircle2} label={lang === "ar" ? "تلاميذ دفعوا" : "Élèves payés"} value={stats.paidStudentsCount}
          color="#4ade80" bg="rgba(74,222,128,0.1)" border="rgba(74,222,128,0.25)" />
        <StatCard icon={AlertCircle} label={lang === "ar" ? "لم يدفعوا" : "Non payés"} value={stats.unpaidStudentsCount}
          color="#f87171" bg="rgba(248,113,113,0.12)" border="rgba(248,113,113,0.28)" />
        <StatCard icon={Users} label={lang === "ar" ? "إجمالي التلاميذ (انقر للعرض)" : "Total élèves (cliquer)"} value={stats.totalStudents}
          color="#818cf8" bg="rgba(99,102,241,0.12)" border="rgba(99,102,241,0.28)"
          onClick={() => onNav && onNav({ screen: "parents" })} />
        <StatCard icon={BarChart2} label={lang === "ar" ? "إجمالي الأفواج" : "Total groupes"} value={stats.totalGroups}
          color={C.accent} bg="rgba(226,150,58,0.12)" border="rgba(226,150,58,0.28)" />
      </div>

      {/* ── Bar Chart ─────────────────────────────────────────── */}
      <MiniBarChart data={chartData} lang={lang} />

      {/* ── Group Summary Cards ───────────────────────────────── */}
      <div style={{ marginBottom: 30 }}>
        <h3 className="f-display" style={{ margin: "0 0 16px", fontSize: 18, color: C.ink, fontWeight: 700 }}>
          {lang === "ar" ? "ملخص الأفواج" : "Bilan par groupe"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {sgOptions.map(sg => {
            const students = data.students.filter(s => {
              const en = (data.enrollments || []).find(e => e.studentId === s.id && e.academicYearId === activeYearId);
              return en && en.groupId === sg.id;
            });
            const cat = CAT_BY_ID[sg.categoryId];
            let sgPaid = 0, sgPartial = 0, sgUnpaid = 0;
            let paidCount = 0, partialCount = 0, unpaidCount = 0;

            let expected = 0;
            students.forEach(st => {
              const en = (data.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
              const stPrice = en ? (en.monthlyPrice || 0) : 0;
              expected += stPrice;

              const pmt = data.payments.find(p => p.studentId === st.id && p.groupId === sg.id && p.month === selectedMonth && (p.academicYearId === activeYearId || !p.academicYearId));
              if (pmt?.status === "paid") { sgPaid += pmt.expectedAmount || stPrice; paidCount++; }
              else if (pmt?.status === "partial") { sgPaid += pmt.paidAmount || 0; sgPartial += (pmt.expectedAmount || stPrice) - (pmt.paidAmount || 0); partialCount++; }
              else { sgUnpaid += stPrice || 0; unpaidCount++; }
            });

            const rate = expected > 0 ? Math.round((sgPaid / expected) * 100) : 0;

            return (
              <div key={sg.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 20px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  {cat && <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.ink }}>{sg.nom}</div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft }}>{students.length} {lang === "ar" ? "تلاميذ" : "élèves"}</div>
                  </div>
                  <button
                    onClick={() => markAllPaid(sg.id)}
                    style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}
                  >
                    {lang === "ar" ? "تحديد الكل" : "Tout payer"}
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 8, marginBottom: 12, overflow: "hidden" }}>
                  <div style={{ width: `${rate}%`, height: "100%", background: "linear-gradient(90deg, #4ade80, #22c55e)", borderRadius: 6, transition: "width 0.5s ease" }} />
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: C.inkSoft, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "متوقع" : "Attendu"}</div>
                    <div style={{ color: C.ink, fontWeight: 700, marginTop: 2 }}>{DA(expected)}</div>
                  </div>
                  <div>
                    <div style={{ color: C.inkSoft, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "محصل" : "Payé"}</div>
                    <div style={{ color: "#4ade80", fontWeight: 700, marginTop: 2 }}>{DA(sgPaid)}</div>
                  </div>
                  <div>
                    <div style={{ color: C.inkSoft, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "متبقي" : "Impayé"}</div>
                    <div style={{ color: "#f87171", fontWeight: 700, marginTop: 2 }}>{DA(sgUnpaid + sgPartial)}</div>
                  </div>
                </div>

                {/* Count pills */}
                <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  {paidCount > 0 && <span style={{ fontSize: 11, color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{paidCount} {lang === "ar" ? "دفعوا" : "payés"}</span>}
                  {partialCount > 0 && <span style={{ fontSize: 11, color: C.accent, background: "rgba(226,150,58,0.12)", border: "1px solid rgba(226,150,58,0.3)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{partialCount} {lang === "ar" ? "جزئي" : "partiels"}</span>}
                  {unpaidCount > 0 && <span style={{ fontSize: 11, color: "#f87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{unpaidCount} {lang === "ar" ? "لم يدفعوا" : "impayés"}</span>}
                </div>

                {/* Navigate button */}
                <button
                  onClick={() => onNav({ screen: "group", groupId: sg.id })}
                  style={{ marginTop: 14, width: "100%", padding: "8px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.05)", color: C.inkSoft, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  {lang === "ar" ? "فتح الفوج ←" : "Ouvrir le groupe →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Student Payment Table ─────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h3 className="f-display" style={{ margin: 0, fontSize: 18, color: C.ink, fontWeight: 700 }}>
            {lang === "ar" ? "جدول المدفوعات" : "Tableau des paiements"}
          </h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* Group filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "6px 12px" }}>
              <Filter size={14} color={C.inkSoft} />
              <select
                value={filterGroup}
                onChange={e => setFilterGroup(e.target.value)}
                style={{ background: "transparent", border: "none", color: C.ink, fontSize: 13, outline: "none", colorScheme: "dark" }}
              >
                <option value="all">{lang === "ar" ? "كل الأفواج" : "Tous les groupes"}</option>
                {sgOptions.map(sg => <option key={sg.id} value={sg.id}>{sg.nom}</option>)}
              </select>
            </div>

            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "6px 12px" }}>
              <Search size={14} color={C.inkSoft} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={lang === "ar" ? "بحث عن تلميذ…" : "Rechercher un élève…"}
                style={{ background: "transparent", border: "none", color: C.ink, fontSize: 13, outline: "none", width: 150 }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto", borderRadius: 16, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>{lang === "ar" ? "التلميذ" : "Élève"}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>{lang === "ar" ? "الفوج" : "Groupe"}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>{lang === "ar" ? "السعر الشهري" : "Mensualité"}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>{lang === "ar" ? "حالة الدفع" : "Statut"}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>{lang === "ar" ? "المبلغ المدفوع" : "Montant payé"}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>{lang === "ar" ? "المتبقي" : "Reste"}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>{lang === "ar" ? "تاريخ الدفع" : "Date paiement"}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>{lang === "ar" ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "30px", textAlign: "center", color: C.inkSoft }}>
                    {lang === "ar" ? "لا توجد بيانات" : "Aucune donnée"}
                  </td>
                </tr>
              ) : studentRows.map(({ student: st, group: sg, payment: pmt }) => {
                const en = (data.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
                const price = en ? (en.monthlyPrice || 0) : 0;
                const paidAmt = !pmt || pmt.status === "unpaid" ? 0 : pmt.status === "paid" ? price : (pmt.paidAmount || 0);
                const remaining = price - paidAmt;
                const pill = statusPill(pmt, price);
                const cat = CAT_BY_ID[sg.categoryId];
                
                const fin = getStudentFinancialSummary(data, st.id, activeYearId);
                const hasOldDebt = fin.previousDebtRemaining > 0;

                return (
                  <tr
                    key={`${st.id}-${sg.id}`}
                    style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Student */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(226,150,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: C.accent, flexShrink: 0 }}>
                          {st.prenom?.[0]}{st.nom?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{st.prenom} {st.nom}</div>
                          {hasOldDebt && (
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", marginTop: 2, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", padding: "2px 6px", borderRadius: 4, display: "inline-block" }}>
                              {lang === "ar" ? `عليه ديون: ${DA(fin.previousDebtRemaining)}` : `Dette: ${DA(fin.previousDebtRemaining)}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Group */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        {cat && <span style={{ width: 7, height: 7, borderRadius: "50%", background: cat.color, display: "inline-block" }} />}
                        <span style={{ color: C.inkSoft, whiteSpace: "nowrap" }}>{sg.nom}</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: "12px 14px", textAlign: "center", color: C.inkSoft, fontWeight: 600 }}>{DA(price)}</td>

                    {/* Status */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: pill.color, background: pill.bg, border: `1px solid ${pill.border}`, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                        {pill.label}
                      </span>
                    </td>

                    {/* Paid */}
                    <td style={{ padding: "12px 14px", textAlign: "center", color: paidAmt > 0 ? "#4ade80" : C.inkSoft, fontWeight: paidAmt > 0 ? 700 : 400 }}>
                      {DA(paidAmt)}
                    </td>

                    {/* Remaining */}
                    <td style={{ padding: "12px 14px", textAlign: "center", color: remaining > 0 ? "#f87171" : C.inkSoft, fontWeight: remaining > 0 ? 700 : 400 }}>
                      {DA(remaining)}
                    </td>

                    {/* Date */}
                    <td style={{ padding: "12px 14px", textAlign: "center", color: C.inkSoft, fontSize: 12 }}>
                      {pmt?.paidDate || "—"}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <button
                        onClick={() => setEditPayment({ student: st, group: sg, payment: pmt })}
                        style={{ background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)", borderRadius: 8, padding: "5px 10px", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "0 auto" }}
                      >
                        <Edit2 size={12} /> {lang === "ar" ? "تعديل" : "Modifier"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment Edit Modal ────────────────────────────────── */}
      {editPayment && (
        <PaymentEditModal
          student={editPayment.student}
          group={editPayment.group}
          payment={editPayment.payment}
          selectedMonth={selectedMonth}
          onClose={() => setEditPayment(null)}
          onSave={handleSavePayment}
          data={data}
          activeYearId={activeYearId}
        />
      )}
    </div>
  );
}
