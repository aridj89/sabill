import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft, Plus, Trash2, Users, Calendar, CreditCard,
  CheckCircle2, XCircle, Edit2, Clock, AlertTriangle,
  ChevronRight, BookOpen, Save, Radio,
} from "lucide-react";
import { C, uid, CAT_BY_ID, computeCycles, DAY_SHORT, getStudentFinancialSummary, generateSessions } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import Modal from "../../components/ui/Modal";
import Pill from "../../components/ui/Pill";
import StudentFormModal from "./StudentFormModal";
import SessionDetailModal from "./SessionDetailModal";
import GroupFormModal from "./GroupFormModal";
import ExtraSessionModal from "./ExtraSessionModal";
import { notifyPresenceChange, notifyPaymentRequired, notifyExtraSessionAdded, notifyPaymentReceived, notifyAccountUpdated } from "../../utils/notificationEngine";
import { deleteGroupApi, updateGroupApi } from "../../utils/groupApi";

/* ── TAB button ──────────────────────────────────────────────── */
function Tab({ label, icon: Icon, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "9px 16px", borderRadius: 12,
        border: active ? "1px solid rgba(226,150,58,0.45)" : "1px solid transparent",
        background: active ? "rgba(226,150,58,0.15)" : "transparent",
        color: active ? C.accent : "rgba(255,255,255,0.6)",
        fontSize: 13.5, fontWeight: active ? 700 : 500,
        cursor: "pointer", transition: "all 0.15s", position: "relative",
      }}
    >
      <Icon size={15} />
      {label}
      {badge > 0 && (
        <span style={{ background: C.bad, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "1px 5px", marginLeft: 2 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Upcoming sessions mini calendar ─────────────────────────── */
function SessionsList({ sessions, subgroup, students, data, setData, toastFn }) {
  const { lang, t } = useLanguage();
  const [openSession, setOpenSession] = useState(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const sorted = [...sessions].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const saveSession = (updatedSess, newAttendances) => {
    setData(d => {
      // Check if we need to create payment cycles
      const updatedSessions = d.sessions.map(s => s.id === updatedSess.id ? updatedSess : s);
    const done = updatedSessions.filter(s => s.groupId === subgroup.id && s.status === "done").length;
      const cycles = Math.floor(done / (subgroup.sessionsPerCycle || 4));

      // Remove old attendances for this session, add new ones
      const otherAtt = d.attendances.filter(a => a.sessionId !== updatedSess.id);
      const newAtt = [...otherAtt, ...newAttendances];

      // Auto-create payment records for completed cycles
      let payments = [...d.payments];
      let notifs = [...(d.userNotifications || [])];
      const studentsInSg = d.students.filter(s => s.groupId === subgroup.id);

      // Générer notifications pour les absences
      newAttendances.forEach(att => {
        if (!att.present) {
          notifs = notifyPresenceChange({ ...d, userNotifications: notifs }, att.studentId, updatedSess.date, false);
        }
      });

      studentsInSg.forEach(st => {
        for (let c = 1; c <= cycles; c++) {
          const has = payments.some(p => p.studentId === st.id && p.subgroupId === subgroup.id && p.cycleNum === c);
          if (!has) {
            const sgPrice = st.monthlyPrice || st.montant || subgroup.price;
            payments.push({
              id: uid(),
              studentId: st.id,
              groupId: subgroup.id,
              cycleNum: c,
              amount: sgPrice,
              paid: false,
              paidDate: null,
            });
            // Notifier l'étudiant du paiement en attente
            notifs = notifyPaymentRequired({ ...d, userNotifications: notifs }, st.id, st.monthlyPrice || st.montant || subgroup.price, c);
          }
        }
      });

      return { ...d, sessions: updatedSessions, attendances: newAtt, payments, userNotifications: notifs };
    });
    setOpenSession(null);
    if (toastFn) toastFn(lang === "ar" ? "تم حفظ الحصة ✓" : "Séance enregistrée ✓");
  };

  const statusStyle = (s) => ({
    planned:   { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", color: "#818cf8" },
    done:      { bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)", color: "#4ade80" },
    cancelled: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", color: "#f87171" },
  }[s] || {});

  const saveExtraSession = (es) => {
    setData(d => {
      const extraSessions = [...(d.extraSessions || []), es];
      // Create session object so it shows up in calendar and student dashboard
      const sessionEntry = {
        id: es.id,
        subgroupId: es.subgroupId,
        date: es.date,
        time: es.time,
        isExtra: true,
        price: es.price,
        isGroupPrice: es.isGroupPrice,
        note: es.note,
        status: "planned",
      };
      const sessions = [...(d.sessions || []), sessionEntry];
      // Notify all students in this subgroup
      const userNotifications = notifyExtraSessionAdded(d, subgroup.id, es, lang);
      return {
        ...d,
        extraSessions,
        sessions,
        userNotifications,
      };
    });
    setShowExtraModal(false);
    if (toastFn) toastFn(lang === "ar" ? "تمت إضافة الحصة الإضافية وإشعار جميع التلاميذ بنجاح ✓" : "Séance suppl. ajoutée et élèves notifiés ✓");
  };

  return (
    <>
      {/* ── Sessions List ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <PrimaryBtn onClick={() => setShowExtraModal(true)}><Plus size={16} /> {t("addExtraSession")}</PrimaryBtn>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {sorted.map(sess => {
          const ss = statusStyle(sess.status);
          const att = data.attendances.filter(a => a.sessionId === sess.id);
          const presentCnt = att.filter(a => a.present).length;
          const sgStudents = students.length;
          const isExtra = sess.isExtra; // Note: extra sessions logic
          
          return (
            <div
              key={sess.id}
              onClick={() => !isExtra ? setOpenSession(sess) : null} // TODO: Extra session detail
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                borderRadius: 13, cursor: isExtra ? "default" : "pointer",
                background: ss.bg || "rgba(255,255,255,0.05)",
                border: `1px solid ${isExtra ? C.accent : (ss.border || C.border)}`,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <div style={{ width: 44, height: 44, borderRadius: 11, background: isExtra ? "rgba(226,150,58,0.2)" : ss.bg, border: `1px solid ${isExtra ? "rgba(226,150,58,0.4)" : ss.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={12} color={isExtra ? C.accent : ss.color} />
                <span style={{ fontSize: 11, fontWeight: 800, color: isExtra ? C.accent : ss.color, marginTop: 1 }}>{sess.time}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                  {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  {isExtra && <span style={{ background: C.accentSoft, color: C.accent, fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>{lang === "ar" ? "إضافية" : "Extra"}</span>}
                </div>
                {sess.note && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sess.note}</div>}
              </div>
              {sess.status === "done" && !isExtra && (
                <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
                  {presentCnt}/{sgStudents}
                </span>
              )}
              {!isExtra && <ChevronRight size={14} color={C.inkSoft} />}
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", color: C.inkSoft, padding: "24px 0" }}>
            {lang === "ar" ? "لا توجد حصص" : "Aucune séance"}
          </div>
        )}
      </div>

      {openSession && (
        <SessionDetailModal
          session={openSession}
          subgroup={subgroup}
          students={students}
          attendances={data.attendances}
          onClose={() => setOpenSession(null)}
          onSave={saveSession}
        />
      )}

      {showExtraModal && (
        <ExtraSessionModal
          subgroupId={subgroup.id}
          onClose={() => setShowExtraModal(false)}
          onSave={saveExtraSession}
        />
      )}
    </>
  );
}

/* ── Payment Edit Modal (inline) ─────────────────────────────── */
function PayEditModal({ student, subgroup, payment, month, onClose, onSave }) {
  const { lang } = useLanguage();
  const price = student.monthlyPrice || student.montant || 0;
  const [status, setStatus] = useState(payment?.status || "unpaid");
  const [paidAmount, setPaidAmount] = useState(
    payment?.status === "paid" ? price : (payment?.paidAmount || 0)
  );
  const [paidDate, setPaidDate] = useState(payment?.paidDate || new Date().toISOString().slice(0, 10));

  const handleSave = () => {
    const finalPaid = status === "paid" ? price : status === "partial" ? Number(paidAmount) : 0;
    onSave({
      id: payment?.id || uid(),
      studentId: student.id,
      groupId: subgroup.id,
      month,
      expectedAmount: price,
      paidAmount: finalPaid,
      status,
      paidDate: status !== "unpaid" ? paidDate : null,
    });
  };

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${C.border}`, fontSize: 14, color: C.ink,
    outline: "none", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)", boxSizing: "border-box",
  };

  const statusOpts = [
    { v: "paid",    l: lang === "ar" ? "مدفوع ✓"     : "Payé ✓",     c: "#4ade80", b: "rgba(74,222,128,0.15)", br: "rgba(74,222,128,0.4)" },
    { v: "partial", l: lang === "ar" ? "جزئي ○"      : "Partiel ○",  c: C.accent,  b: "rgba(226,150,58,0.15)", br: "rgba(226,150,58,0.4)" },
    { v: "unpaid",  l: lang === "ar" ? "غير مدفوع ✗" : "Impayé ✗",  c: "#f87171", b: "rgba(248,113,113,0.15)", br: "rgba(248,113,113,0.4)" },
  ];

  return (
    <Modal
      title={`${lang === "ar" ? "دفع" : "Paiement"} — ${student.prenom} ${student.nom}`}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, color: C.inkSoft }}>
            {lang === "ar" ? "السعر الشهري" : "Mensualité"}: <strong style={{ color: C.accent }}>{price} DA</strong>
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
            {lang === "ar" ? "الحالة" : "Statut"}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {statusOpts.map(opt => (
              <button key={opt.v} onClick={() => { setStatus(opt.v); if (opt.v === "paid") setPaidAmount(price); if (opt.v === "unpaid") setPaidAmount(0); }}
                style={{ flex: 1, padding: "7px 4px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, border: `1.5px solid ${status === opt.v ? opt.br : "rgba(255,255,255,0.15)"}`, background: status === opt.v ? opt.b : "rgba(255,255,255,0.04)", color: status === opt.v ? opt.c : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.15s" }}
              >{opt.l}</button>
            ))}
          </div>
        </div>
        {status === "partial" && (
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
              {lang === "ar" ? "المبلغ المدفوع (DA)" : "Montant payé (DA)"}
            </label>
            <input type="number" value={paidAmount} min={0} max={price} onChange={e => setPaidAmount(e.target.value)} style={inp} />
            <div style={{ fontSize: 11.5, color: C.accent, marginTop: 6, fontWeight: 600 }}>
              {lang === "ar" ? "المتبقي" : "Reste"}: {price - Number(paidAmount)} DA
            </div>
          </div>
        )}
        {status !== "unpaid" && (
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
              {lang === "ar" ? "تاريخ الدفع" : "Date du paiement"}
            </label>
            <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} style={inp} />
          </div>
        )}
        <PrimaryBtn full onClick={handleSave}>
          <Save size={15} /> {lang === "ar" ? "حفظ الدفع" : "Enregistrer"}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

/* ── Payments tab ────────────────────────────────────────────── */
function PaymentsTab({ subgroup, students, data, setData }) {
  const { lang, t } = useLanguage();
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [editSt, setEditSt] = useState(null);
  const payments = data.payments.filter(p => p.groupId === subgroup.id && p.month === selectedMonth);

  const handleSavePayment = (pmtData) => {
    setData(d => {
      const existing = d.payments.find(p => p.id === pmtData.id);
      const newPayments = existing
        ? d.payments.map(p => p.id === pmtData.id ? pmtData : p)
        : [...d.payments, pmtData];
      
      let nextNotifs = d.userNotifications || [];
        if (pmtData.status === "paid" || (pmtData.status === "partial" && pmtData.paidAmount > 0)) {
        const amount = pmtData.status === "paid" ? (pmtData.expectedAmount || 0) : pmtData.paidAmount;
          nextNotifs = notifyPaymentReceived(d, pmtData.studentId, amount, {
            type: "course",
            groupId: subgroup.id,
            month: selectedMonth
          }, lang);
      }

      return { ...d, payments: newPayments, userNotifications: nextNotifs };
    });
    setEditSt(null);
  };

  let totalPaid = 0;
  const totalExpected = students.reduce((sum, st) => sum + (st.monthlyPrice || st.montant || 0), 0);
  payments.forEach(p => {
    if (p.status === "paid") totalPaid += p.expectedAmount || 0;
    else if (p.status === "partial") totalPaid += p.paidAmount || 0;
  });
  const collRate = totalExpected > 0 ? Math.min(100, Math.round(totalPaid / totalExpected * 100)) : 0;

  const thSt = {
    textAlign: "left", padding: "10px 12px", color: C.inkSoft, fontWeight: 700,
    borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)",
    fontSize: 12, whiteSpace: "nowrap",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.inkSoft }}>{lang === "ar" ? "متوقع" : "Attendu"}: <strong style={{ color: C.ink }}>{totalExpected} DA</strong></span>
          <span style={{ fontSize: 12, color: C.inkSoft }}>{lang === "ar" ? "محصل" : "Encaissé"}: <strong style={{ color: "#4ade80" }}>{totalPaid} DA</strong></span>
          <span style={{ fontSize: 12, color: C.inkSoft }}>{lang === "ar" ? "متبقي" : "Reste"}: <strong style={{ color: "#f87171" }}>{totalExpected - totalPaid} DA</strong></span>
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{collRate}%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "5px 10px" }}>
          <Calendar size={14} color={C.accent} />
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ background: "transparent", border: "none", color: C.ink, fontSize: 13, outline: "none", colorScheme: "dark" }} />
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 5, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ width: `${collRate}%`, height: "100%", background: "linear-gradient(90deg, #4ade80, #22c55e)", borderRadius: 6, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            <th style={thSt}>{lang === "ar" ? "التلميذ" : "Élève"}</th>
            <th style={{ ...thSt, textAlign: "center" }}>{lang === "ar" ? "السعر" : "Prix"}</th>
            <th style={{ ...thSt, textAlign: "center" }}>{lang === "ar" ? "الحالة" : "Statut"}</th>
            <th style={{ ...thSt, textAlign: "center" }}>{lang === "ar" ? "المدفوع" : "Payé"}</th>
            <th style={{ ...thSt, textAlign: "center" }}>{lang === "ar" ? "المتبقي" : "Reste"}</th>
            <th style={{ ...thSt, textAlign: "center" }}>{lang === "ar" ? "التاريخ" : "Date"}</th>
            <th style={{ ...thSt, textAlign: "center" }}>{lang === "ar" ? "إجراء" : "Action"}</th>
          </tr></thead>
          <tbody>
            {students.map(st => {
              const pmt = payments.find(p => p.studentId === st.id);
              const price = st.monthlyPrice || st.montant || 0;
              const paid = !pmt || pmt.status === "unpaid" ? 0 : pmt.status === "paid" ? price : (pmt.paidAmount || 0);
              const rest = price - paid;
              const sStat = !pmt || pmt.status === "unpaid" ? "unpaid" : pmt.status;
              const sColor = sStat === "paid" ? "#4ade80" : sStat === "partial" ? C.accent : "#f87171";
              const sBg = sStat === "paid" ? "rgba(74,222,128,0.15)" : sStat === "partial" ? "rgba(226,150,58,0.15)" : "rgba(248,113,113,0.15)";
              const sLabel = sStat === "paid" ? (lang === "ar" ? "مدفوع ✓" : "Payé ✓") : sStat === "partial" ? (lang === "ar" ? "جزئي ○" : "Partiel ○") : (lang === "ar" ? "غير مدفوع ✗" : "Impayé ✗");
              return (
                <tr key={st.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: C.accent, flexShrink: 0 }}>{st.prenom?.[0]}{st.nom?.[0]}</div>
                      <div style={{ fontWeight: 600, color: C.ink }}>{st.prenom} {st.nom}</div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: C.inkSoft }}>{price} DA</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: sColor, background: sBg, padding: "2px 9px", borderRadius: 999 }}>{sLabel}</span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: paid > 0 ? "#4ade80" : C.inkSoft, fontWeight: paid > 0 ? 700 : 400 }}>{paid} DA</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: rest > 0 ? "#f87171" : C.inkSoft, fontWeight: rest > 0 ? 700 : 400 }}>{rest} DA</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: C.inkSoft, fontSize: 11.5 }}>{pmt?.paidDate || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button onClick={() => setEditSt({ student: st, payment: pmt })}
                      style={{ background: "rgba(226,150,58,0.12)", border: "1px solid rgba(226,150,58,0.35)", borderRadius: 8, padding: "4px 9px", color: C.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "0 auto" }}
                    ><Edit2 size={11} /> {lang === "ar" ? "تعديل" : "Modifier"}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editSt && (
        <PayEditModal student={editSt.student} subgroup={subgroup} payment={editSt.payment} month={selectedMonth} onClose={() => setEditSt(null)} onSave={handleSavePayment} />
      )}
    </div>
  );
}

import NfcAttendanceScreen from "./NfcAttendanceScreen";

/* ── Presences tab ───────────────────────────────────────────── */
function PresencesTab({ subgroup, students, data, setData, toastFn, onNav, onEdit, onDelete }) {
  const { lang } = useLanguage();
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const toggleAttendance = (studentId, existingAtt, idx) => {
    setData(d => {
      let newAtt;
      if (existingAtt) {
        // Remove existing attendance
        newAtt = d.attendances.filter(a => a.id !== existingAtt.id);
      } else {
        // Add new attendance
        // Ensure date falls within selected month (use today if in current month, else 1st of month)
        const dateToUse = todayStr.startsWith(selectedMonth) ? todayStr : `${selectedMonth}-01`;
        newAtt = [...(d.attendances || []), { id: uid(), studentId, date: dateToUse, present: true }];
      }
      return { ...d, attendances: newAtt };
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 30 }}>
        <NfcAttendanceScreen 
          data={data} 
          setData={setData} 
          toastFn={toastFn} 
          embeddedSubgroupId={subgroup.id} 
          onNav={onNav} 
        />
      </div>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: C.inkSoft, fontWeight: 700 }}>
          {lang === "ar" ? "سجل الحضور - 4 حصص شهرياً" : "Registre de présence (4 séances/mois)"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "5px 10px" }}>
          <Calendar size={14} color={C.accent} />
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ background: "transparent", border: "none", color: C.ink, fontSize: 13, outline: "none", colorScheme: "dark" }} />
        </div>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)" }}>
                {lang === "ar" ? "التلميذ" : "Élève"}
              </th>
              {[1, 2, 3, 4].map(num => (
                <th key={num} style={{ textAlign: "center", padding: "8px 6px", color: C.inkSoft, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", width: 70 }}>
                  {lang === "ar" ? `حصة ${num}` : `S${num}`}
                </th>
              ))}
              <th style={{ textAlign: "center", padding: "8px 10px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)" }}>
                %
              </th>
              <th style={{ textAlign: "center", padding: "8px 10px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)" }}>
                {lang === "ar" ? "إجراء" : "Action"}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map(st => {
              // Get attendances for this student in the selected month
              const stAttendances = (data.attendances || [])
                .filter(a => a.studentId === st.id && a.date.startsWith(selectedMonth))
                .sort((a, b) => a.date.localeCompare(b.date));
              
              const presentCount = stAttendances.filter(a => a.present).length;

              return (
                <tr key={st.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 12px", color: C.ink, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: C.accent, flexShrink: 0 }}>
                        {st.prenom?.[0]}{st.nom?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{st.prenom} {st.nom}</div>
                        <div style={{ fontSize: 10.5, color: C.inkSoft, display: "flex", gap: 6, marginTop: 2 }}>
                          {st.phone && <span>{st.phone}</span>}
                          {st.nfcCardId && <span style={{ color: "#4ade80" }}>NFC ✓</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {[0, 1, 2, 3].map(idx => {
                    const att = stAttendances[idx]; // Chronological mapping
                    const isPresent = att ? att.present : false;
                    return (
                      <td key={idx} style={{ textAlign: "center", padding: "8px 6px" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <input 
                            type="checkbox" 
                            className="theme-checkbox" 
                            checked={isPresent} 
                            onChange={() => toggleAttendance(st.id, att, idx)} 
                            style={{ width: 20, height: 20, cursor: "pointer" }}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center", padding: "8px 10px", fontWeight: 700, color: presentCount >= 3 ? "#4ade80" : (presentCount > 0 ? "#fbbf24" : "#f87171"), fontSize: 13 }}>
                    {Math.round((presentCount / 4) * 100)}%
                  </td>
                  <td style={{ textAlign: "center", padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                      <button onClick={() => onEdit(st)} title={lang === "ar" ? "تعديل" : "Modifier"} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 6px", color: C.inkSoft, cursor: "pointer" }}><Edit2 size={12} /></button>
                      <button onClick={() => onDelete(st.id)} title={lang === "ar" ? "حذف" : "Supprimer"} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "4px 6px", color: "#f87171", cursor: "pointer" }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: C.inkSoft, padding: "30px 0" }}>
                  {lang === "ar" ? "لا يوجد تلاميذ" : "Aucun élève"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── MAIN SubgroupScreen ─────────────────────────────────────── */
export default function SubgroupScreen({ groupId, subgroupId, catId, levelId, groupType, openAddStudent, openSessionId, data, setData, toastFn, onBack, onNav, activeYearId, isReadOnlyYear }) {
  const { lang } = useLanguage();

  const effectiveGroupId = groupId || subgroupId;
  let foundSg = (data.groups || []).find(s => s.id === effectiveGroupId);
  if (!foundSg && levelId && catId) {
    foundSg = (data.groups || []).find(s => s.categoryId === catId && s.levelId === levelId && (!groupType || s.groupType === groupType));
  }
  if (!foundSg && levelId) {
    foundSg = (data.groups || []).find(s => s.levelId === levelId && (!groupType || s.groupType === groupType));
  }

  // Fallback group object so it NEVER crashes or says "Groupe introuvable"
  const resolvedCatId = catId || (levelId?.includes("cem") ? "cem" : "primaire");
  const resolvedLevel = levelId || "1ère";
  const resolvedType = groupType || "Normal";
  const catObj = CAT_BY_ID[resolvedCatId];
  const langLevelObj = resolvedCatId === "langues" ? (data.langLevels || []).find(l => l.id === resolvedLevel) : null;
  const levelDisplayName = langLevelObj ? langLevelObj.nom : resolvedLevel;

  const fallbackSg = {
    id: effectiveGroupId || uid(),
    nom: levelDisplayName ? `${levelDisplayName} - ${resolvedType}` : `${catObj?.label || "Groupe"} - ${resolvedType}`,
    categoryId: resolvedCatId,
    levelId: resolvedLevel,
    groupType: resolvedType,
    days: [],
    time: "10:00",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 9 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    sessionsPerCycle: 4,
    academicYearId: activeYearId || null,
  };

  const sg = foundSg || fallbackSg;

  const saveSubgroup = async (updatedSg) => {
    try {
      await updateGroupApi(updatedSg.id, updatedSg);
    } catch (err) {
      console.warn("Backend group update notice:", err.message);
    }
    setData(d => ({
      ...d,
      groups: (d.groups || []).map(g => g.id === updatedSg.id ? updatedSg : g)
    }));
    setShowEditSg(false);
    if (toastFn) toastFn(lang === "ar" ? "تم تعديل الفوج ✓" : "Groupe modifié ✓");
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(lang === "ar" ? "هل تريد حذف هذه المجموعة وكل بياناتها؟" : "Supprimer ce groupe et toutes ses données ?")) return;
    try {
      await deleteGroupApi(sg.id);
      setData(d => ({
        ...d,
        groups:      (d.groups || []).filter(g => g.id !== sg.id),
        enrollments: (d.enrollments || []).filter(e => e.groupId !== sg.id),
        sessions:    (d.sessions || []).filter(s => s.groupId !== sg.id),
        attendances: (d.attendances || []).filter(a => {
          const sess = (d.sessions || []).find(s => s.id === a.sessionId);
          return sess && sess.groupId !== sg.id;
        }),
        payments:    (d.payments || []).filter(p => p.groupId !== sg.id),
      }));
      if (toastFn) toastFn(lang === "ar" ? "تم الحذف" : "Groupe supprimé");
      if (onBack) onBack();
    } catch (err) {
      console.error("Erreur suppression groupe:", err);
      alert(err.message || (lang === "ar" ? "فشل حذف الفوج" : "Échec de la suppression du groupe."));
    }
  };

  const cat = CAT_BY_ID[sg.categoryId] || catObj;

  const students = (data.enrollments || [])
    .filter(e => e.groupId === sg.id && (!activeYearId || e.academicYearId === activeYearId))
    .map(e => {
      const st = (data.students || []).find(s => s.id === e.studentId);
      return st ? { ...st, monthlyPrice: e.monthlyPrice || st.monthlyPrice || st.montant || 0 } : null;
    })
    .filter(Boolean);
  const sessions = (data.sessions || []).filter(s => s.groupId === sg.id);
  const payments = (data.payments || []).filter(p => p.groupId === sg.id);
  const unpaidPmt = payments.filter(p => !p.paid).length;
  const unpaidEnroll = students.filter(s => !s.enrollmentPaid).length;
  const catColor = cat?.color || C.accent;

  // Default to presences tab to allow immediate student registration
  const [tab, setTab] = useState("presences");
  const [showAddStudent, setShowAddStudent] = useState(Boolean(openAddStudent || students.length === 0));
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditSg, setShowEditSg] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);

  const saveExtraSession = (es) => {
    setData(d => {
      const extraSessions = [...(d.extraSessions || []), es];
      const sessionEntry = {
        id: es.id,
        subgroupId: es.subgroupId,
        date: es.date,
        time: es.time,
        isExtra: true,
        price: es.price,
        isGroupPrice: es.isGroupPrice,
        note: es.note,
        status: "planned",
      };
      const sessions = [...(d.sessions || []), sessionEntry];
      const userNotifications = notifyExtraSessionAdded(d, sg.id, es, lang);
      return { ...d, extraSessions, sessions, userNotifications };
    });
    setShowExtraModal(false);
    if (toastFn) toastFn(lang === "ar" ? "تمت إضافة الحصة الإضافية وإشعار جميع التلاميذ بنجاح ✓" : "Séance suppl. ajoutée et élèves notifiés ✓");
  };

  // Get current year obj for GroupFormModal
  const currentYearObj = (data.academicYears || []).find(y => y.id === activeYearId);

  useEffect(() => {
    if (openAddStudent || students.length === 0) {
      setShowAddStudent(true);
    }
  }, [openAddStudent, sg.id]);

  const saveStudent = (student) => {
    setData(d => {
      const exists = d.students.some(s => s.id === student.id);
      let notifs = d.userNotifications || [];
      if (exists) {
        notifs = notifyAccountUpdated(d, student.id, lang === "ar" ? "تم تعديل وتحديث بيانات حسابك من قبل الإدارة." : "Votre profil a été mis à jour par l'administration.", lang);
      }
      const existingEnrollment = (d.enrollments || []).find(e => e.studentId === student.id && e.academicYearId === activeYearId);
      const enrollmentObj = {
        id: existingEnrollment ? existingEnrollment.id : uid(),
        studentId: student.id,
        academicYearId: activeYearId,
        groupId: student.groupId || null,
        monthlyPrice: Number(student.monthlyPrice) || 0
      };
      const newEnrollments = existingEnrollment 
        ? (d.enrollments || []).map(e => e.id === existingEnrollment.id ? enrollmentObj : e)
        : [...(d.enrollments || []), enrollmentObj];

      return {
        ...d,
        students: exists ? d.students.map(s => s.id === student.id ? student : s) : [...d.students, student],
        enrollments: newEnrollments,
        userNotifications: notifs
      };
    });
    setShowAddStudent(false);
    setEditingStudent(null);
    if (toastFn) toastFn(lang === "ar" ? "تم حفظ التلميذ وإشعاره ✓" : "Élève enregistré & notifié ✓");
  };

  const deleteStudent = (id) => {
    if (!window.confirm(lang === "ar" ? "حذف التلميذ من هذا الفوج؟" : "Retirer cet élève du groupe ?")) return;
    setData(d => ({
      ...d,
      enrollments: (d.enrollments || []).filter(e => !(e.studentId === id && e.groupId === sg.id && e.academicYearId === activeYearId))
    }));
    if (toastFn) toastFn(lang === "ar" ? "تم سحب التلميذ من الفوج" : "Élève retiré du groupe");
  };

  const toggleEnrollment = (studentId) => {
    const feeAmount = data.settings?.enrollmentFee || 500;
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetStudent = students.find(s => s.id === studentId);
    const isNowPaid = targetStudent ? !targetStudent.enrollmentPaid : true;

    setData(d => {
      let notifs = d.userNotifications || [];
      if (isNowPaid) {
        notifs = notifyPaymentReceived(d, studentId, feeAmount, { type: "enrollment" }, lang);
      }
      return {
        ...d,
        students: d.students.map(s => s.id === studentId ? {
          ...s,
          enrollmentPaid: isNowPaid,
          enrollmentDate: isNowPaid ? todayStr : s.enrollmentDate
        } : s),
        userNotifications: notifs,
      };
    });

    if (toastFn) {
      toastFn(isNowPaid
        ? (lang === "ar" ? "تم تسديد حقوق التسجيل وإشعار التلميذ ✓" : "Frais payés & élève notifié ✓")
        : (lang === "ar" ? "تم إلغاء تأكيد دفع التسجيل" : "Frais d'inscription annulés")
      );
    }
  };

  return (
    <div>
      {/* ── Back button + Header ────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            border: `1px solid ${C.border}`,
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
        >
          <ArrowLeft size={16} color={C.accent} />
          <span>{lang === "ar" ? "← العودة إلى قائمة الأفواج" : "← Retour aux groupes"}</span>
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!isReadOnlyYear && (
            <>
              <PrimaryBtn onClick={() => setShowAddStudent(true)}>
                <Plus size={16} /> {lang === "ar" ? "+ تسجيل تلميذ" : "+ Inscrire un élève"}
              </PrimaryBtn>
              <button
                onClick={() => setShowExtraModal(true)}
                style={{
                  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10,
                  padding: "7px 12px", color: "#818cf8", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600
                }}
              >
                <Plus size={14} /> {lang === "ar" ? "+ حصة إضافية" : "+ Séance"}
              </button>
            </>
          )}
          <button onClick={() => setShowEditSg(true)} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
            <Edit2 size={14} /> {lang === "ar" ? "تعديل الفوج" : "Modifier"}
          </button>
          <button
            onClick={handleDeleteGroup}
            title={lang === "ar" ? "حذف الفوج" : "Supprimer le groupe"}
            style={{
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 10,
              padding: "7px 12px",
              color: "#f87171",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 600,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.12)"}
          >
            <Trash2 size={14} /> {lang === "ar" ? "حذف" : "Supprimer"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: catColor, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {cat && <cat.icon size={12} />}
            {cat?.label} {sg.levelId && `· ${sg.levelId}`} {sg.groupType && `· ${sg.groupType}`}
          </div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>{sg.nom}</h2>
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
            {sg.days?.join(", ")} · {sg.time} · {sg.sessionsPerCycle} {lang === "ar" ? "حصص/دورة" : "séances/cycle"}
          </div>
        </div>
      </div>

      {/* ── Summary Stats Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 20 }}>
        <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase" }}>{lang === "ar" ? "إجمالي التلاميذ" : "Total élèves"}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginTop: 2 }}>{students.length}</div>
          </div>
          <Users size={16} color="#818cf8" />
        </div>

        <div onClick={() => setTab("payments")} style={{ background: unpaidEnroll > 0 ? "rgba(251,191,36,0.1)" : "rgba(74,222,128,0.05)", border: `1px solid ${unpaidEnroll > 0 ? "rgba(251,191,36,0.3)" : "rgba(74,222,128,0.2)"}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: unpaidEnroll > 0 ? "#fbbf24" : "#4ade80", textTransform: "uppercase" }}>{lang === "ar" ? "تسجيل غير مدفوع" : "Inscriptions impayées"}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: unpaidEnroll > 0 ? "#fbbf24" : "#4ade80", marginTop: 2 }}>{unpaidEnroll} {lang === "ar" ? "تلميذ" : "élèves"}</div>
          </div>
          <AlertTriangle size={16} color={unpaidEnroll > 0 ? "#fbbf24" : "#4ade80"} />
        </div>

        <div onClick={() => setTab("payments")} style={{ background: unpaidPmt > 0 ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.05)", border: `1px solid ${unpaidPmt > 0 ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.2)"}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: unpaidPmt > 0 ? "#f87171" : "#4ade80", textTransform: "uppercase" }}>{lang === "ar" ? "دفعات معلقة" : "Paiements en attente"}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: unpaidPmt > 0 ? "#f87171" : "#4ade80", marginTop: 2 }}>{unpaidPmt} {lang === "ar" ? "دفعات" : "impayés"}</div>
          </div>
          <CreditCard size={16} color={unpaidPmt > 0 ? "#f87171" : "#4ade80"} />
        </div>
      </div>

      {/* ── Empty State Banner if no students ── */}
      {students.length === 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(226,150,58,0.15), rgba(99,102,241,0.1))",
          border: "1px solid rgba(226,150,58,0.38)",
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(226,150,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={22} color="#E2963A" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>
                {lang === "ar" ? `هذا الفوج (${sg.nom}) فارغ حالياً (0 تلميذ)` : `Ce groupe (${sg.nom}) est actuellement vide (0 élève)`}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                {lang === "ar" ? "اضغط على الزر لتسجيل التلميذ الأول والبدء في تتبع الحصص والغيابات والمدفوعات." : "Inscrivez votre premier élève pour commencer à gérer les séances, présences et paiements."}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddStudent(true)}
            style={{
              padding: "10px 22px", borderRadius: 12,
              background: "linear-gradient(135deg, #E2963A, #f59e0b)",
              border: "none", color: "#fff", fontWeight: 800, fontSize: 13.5,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(226,150,58,0.4)"
            }}
          >
            <Plus size={16} />
            {lang === "ar" ? "+ تسجيل أول تلميذ" : "+ Inscrire le 1er élève"}
          </button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
        <Tab label={lang === "ar" ? "التلاميذ والحضور" : "Élèves & Présences"} icon={Users} active={tab === "presences"} onClick={() => setTab("presences")} />
        <Tab label={lang === "ar" ? "المدفوعات" : "Paiements"} icon={CreditCard} active={tab === "payments"} onClick={() => setTab("payments")} badge={unpaidPmt + unpaidEnroll} />
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      {tab === "presences" && (
        <PresencesTab subgroup={sg} students={students} data={data} setData={setData} toastFn={toastFn} onNav={onNav} onEdit={(st) => setEditingStudent(st)} onDelete={(id) => deleteStudent(id)} />
      )}

      {tab === "payments" && (
        <PaymentsTab subgroup={sg} students={students} data={data} setData={setData} />
      )}

      {/* Modals */}
      {showExtraModal && (
        <ExtraSessionModal
          subgroupId={sg.id}
          onClose={() => setShowExtraModal(false)}
          onSave={saveExtraSession}
        />
      )}
      {(showAddStudent || editingStudent) && (
        <StudentFormModal
          groupId={sg.id}
          initial={editingStudent}
          enrollmentFee={data.settings?.enrollmentFee || 500}
          allStudents={data.students}
          allSubgroups={[...(data.subgroups || []), ...(data.groups || [])]}
          onClose={() => { setShowAddStudent(false); setEditingStudent(null); }}
          onSave={saveStudent}
        />
      )}
      {showEditSg && (
        <GroupFormModal
          catId={sg.categoryId} levelId={sg.levelId} groupType={sg.groupType}
          activeYearId={activeYearId}
          currentYearObj={currentYearObj}
          initial={sg}
          onClose={() => setShowEditSg(false)}
          onSave={saveSubgroup}
        />
      )}
    </div>
  );
}
