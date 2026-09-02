import React, { useState, useMemo } from "react";
import {
  ArrowLeft, Plus, Trash2, Users, Calendar, CreditCard,
  CheckCircle2, XCircle, Edit2, Clock, AlertTriangle,
  ChevronRight, BookOpen,
} from "lucide-react";
import { C, uid, CAT_BY_ID, computeCycles, DAY_SHORT } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import Pill from "../../components/ui/Pill";
import StudentFormModal from "./StudentFormModal";
import SessionDetailModal from "./SessionDetailModal";
import SubgroupFormModal from "./SubgroupFormModal";
import { notifyPresenceChange, notifyPaymentRequired } from "../../utils/notificationEngine";

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
  const { lang } = useLanguage();
  const [openSession, setOpenSession] = useState(null);
  const sorted = [...sessions].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const saveSession = (updatedSess, newAttendances) => {
    setData(d => {
      // Check if we need to create payment cycles
      const updatedSessions = d.sessions.map(s => s.id === updatedSess.id ? updatedSess : s);
      const done = updatedSessions.filter(s => s.subgroupId === subgroup.id && s.status === "done").length;
      const cycles = Math.floor(done / (subgroup.sessionsPerCycle || 4));

      // Remove old attendances for this session, add new ones
      const otherAtt = d.attendances.filter(a => a.sessionId !== updatedSess.id);
      const newAtt = [...otherAtt, ...newAttendances];

      // Auto-create payment records for completed cycles
      let payments = [...d.payments];
      let notifs = [...(d.userNotifications || [])];
      const studentsInSg = d.students.filter(s => s.subgroupId === subgroup.id);

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
            payments.push({
              id: uid(),
              studentId: st.id,
              subgroupId: subgroup.id,
              cycleNum: c,
              amount: subgroup.price,
              paid: false,
              paidDate: null,
            });
            // Notifier l'étudiant du paiement en attente
            notifs = notifyPaymentRequired({ ...d, userNotifications: notifs }, st.id, subgroup.price, c);
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

  return (
    <>
      <div style={{ display: "grid", gap: 8 }}>
        {sorted.map(sess => {
          const ss = statusStyle(sess.status);
          const att = data.attendances.filter(a => a.sessionId === sess.id);
          const presentCnt = att.filter(a => a.present).length;
          const sgStudents = students.length;
          return (
            <div
              key={sess.id}
              onClick={() => setOpenSession(sess)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                borderRadius: 13, cursor: "pointer",
                background: ss.bg || "rgba(255,255,255,0.05)",
                border: `1px solid ${ss.border || C.border}`,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <div style={{ width: 44, height: 44, borderRadius: 11, background: ss.bg, border: `1px solid ${ss.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={12} color={ss.color} />
                <span style={{ fontSize: 11, fontWeight: 800, color: ss.color, marginTop: 1 }}>{sess.time}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                  {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                </div>
                {sess.note && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sess.note}</div>}
              </div>
              {sess.status === "done" && (
                <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
                  {presentCnt}/{sgStudents}
                </span>
              )}
              <ChevronRight size={14} color={C.inkSoft} />
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
    </>
  );
}

/* ── Payments tab ────────────────────────────────────────────── */
function PaymentsTab({ subgroup, students, data, setData }) {
  const { lang } = useLanguage();
  const payments = data.payments.filter(p => p.subgroupId === subgroup.id);
  const cycles   = computeCycles(data.sessions, subgroup);

  const togglePaid = (pId) => {
    setData(d => ({
      ...d,
      payments: d.payments.map(p => p.id === pId ? { ...p, paid: !p.paid, paidDate: !p.paid ? new Date().toISOString().slice(0, 10) : null } : p),
    }));
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {students.map(st => {
        const stPayments = payments.filter(p => p.studentId === st.id).sort((a, b) => a.cycleNum - b.cycleNum);
        const enrollOk   = st.enrollmentPaid;
        return (
          <div key={st.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 16px" }}>
            {/* Student header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.accent }}>
                {st.prenom[0]}{st.nom[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{st.prenom} {st.nom}</div>
                <div style={{ fontSize: 11.5, color: C.inkSoft }}>
                  {lang === "ar" ? "تسجيل" : "Inscription"}: {" "}
                  <span style={{ color: enrollOk ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>
                    {enrollOk ? "✓ " + (lang === "ar" ? "مدفوع" : "Payé") : "⚠ " + (lang === "ar" ? "غير مدفوع" : "Impayé")} ({data.settings?.enrollmentFee || 500} DA)
                  </span>
                </div>
              </div>
            </div>

            {/* Cycle payments */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {stPayments.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePaid(p.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                    border: `1px solid ${p.paid ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
                    background: p.paid ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.12)",
                    color: p.paid ? "#4ade80" : "#f87171",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {lang === "ar" ? "دورة" : "Cycle"} {p.cycleNum} · {p.amount} DA {p.paid ? "✓" : "✗"}
                </button>
              ))}
              {stPayments.length === 0 && (
                <span style={{ fontSize: 12, color: C.inkSoft, fontStyle: "italic" }}>
                  {lang === "ar" ? "لا توجد دورات مكتملة بعد" : "Aucun cycle complété"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Presences tab ───────────────────────────────────────────── */
function PresencesTab({ subgroup, students, data }) {
  const { lang } = useLanguage();
  const doneSessions = data.sessions
    .filter(s => s.subgroupId === subgroup.id && s.status === "done")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (doneSessions.length === 0) {
    return <div style={{ textAlign: "center", color: C.inkSoft, padding: "30px 0" }}>
      {lang === "ar" ? "لا توجد حصص منجزة بعد" : "Aucune séance effectuée"}
    </div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "10px 12px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)" }}>
              {lang === "ar" ? "التلميذ" : "Élève"}
            </th>
            {doneSessions.map(sess => (
              <th key={sess.id} style={{ textAlign: "center", padding: "8px 6px", color: C.inkSoft, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", minWidth: 46 }}>
                {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short" })}
              </th>
            ))}
            <th style={{ textAlign: "center", padding: "8px 10px", color: C.inkSoft, fontWeight: 700, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)" }}>
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map(st => {
            let presentCount = 0;
            return (
              <tr key={st.id}>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.07)`, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>
                  {st.prenom} {st.nom}
                </td>
                {doneSessions.map(sess => {
                  const att = data.attendances.find(a => a.sessionId === sess.id && a.studentId === st.id);
                  const present = att ? att.present : null;
                  if (present) presentCount++;
                  return (
                    <td key={sess.id} style={{ textAlign: "center", padding: "8px 6px", borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                      {present === null
                        ? <span style={{ color: C.inkSoft, fontSize: 11 }}>—</span>
                        : present
                          ? <CheckCircle2 size={16} color="#4ade80" />
                          : <XCircle size={16} color="#f87171" />
                      }
                    </td>
                  );
                })}
                <td style={{ textAlign: "center", padding: "8px 10px", borderBottom: `1px solid rgba(255,255,255,0.07)`, fontWeight: 700, color: doneSessions.length > 0 && presentCount / doneSessions.length >= 0.75 ? "#4ade80" : "#f87171", fontSize: 13 }}>
                  {doneSessions.length > 0 ? Math.round(presentCount / doneSessions.length * 100) : 0}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── MAIN SubgroupScreen ─────────────────────────────────────── */
export default function SubgroupScreen({ subgroupId, openSessionId, data, setData, toastFn, onBack, onNav }) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState("sessions");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditSg, setShowEditSg] = useState(false);

  const sg = data.subgroups.find(s => s.id === subgroupId);
  if (!sg) return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "المجموعة غير موجودة" : "Sous-groupe introuvable"}</div>;

  const cat = CAT_BY_ID[sg.categoryId];
  const students = data.students.filter(s => s.subgroupId === sg.id);
  const sessions = data.sessions.filter(s => s.subgroupId === sg.id);
  const payments = data.payments.filter(p => p.subgroupId === sg.id);
  const unpaidPmt = payments.filter(p => !p.paid).length;
  const unpaidEnroll = students.filter(s => !s.enrollmentPaid).length;
  const catColor = cat?.color || C.accent;

  const saveStudent = (student) => {
    setData(d => {
      const exists = d.students.some(s => s.id === student.id);
      return { ...d, students: exists ? d.students.map(s => s.id === student.id ? student : s) : [...d.students, student] };
    });
    setShowAddStudent(false);
    setEditingStudent(null);
    if (toastFn) toastFn(lang === "ar" ? "تم حفظ التلميذ ✓" : "Élève enregistré ✓");
  };

  const deleteStudent = (id) => {
    if (!window.confirm(lang === "ar" ? "حذف هذا التلميذ؟" : "Supprimer cet élève ?")) return;
    setData(d => ({ ...d, students: d.students.filter(s => s.id !== id) }));
    if (toastFn) toastFn(lang === "ar" ? "تم الحذف" : "Élève supprimé");
  };

  const saveSubgroup = (updatedSg) => {
    setData(d => ({ ...d, subgroups: d.subgroups.map(x => x.id === updatedSg.id ? updatedSg : x) }));
    setShowEditSg(false);
    if (toastFn) toastFn(lang === "ar" ? "تم تعديل المجموعة ✓" : "Sous-groupe modifié ✓");
  };

  const toggleEnrollment = (studentId) => {
    setData(d => ({
      ...d,
      students: d.students.map(s => s.id === studentId ? { ...s, enrollmentPaid: !s.enrollmentPaid } : s),
    }));
  };

  return (
    <div>
      {/* ── Back + title ────────────────────────────────────── */}
      <button onClick={onBack} style={{ border: "none", background: "none", color: C.inkSoft, display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: 0 }}>
        <ArrowLeft size={15} /> {lang === "ar" ? "رجوع" : "Retour"}
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: catColor, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {cat && <cat.icon size={12} />}
            {cat?.label} {sg.levelId && `· ${sg.levelId}`} {sg.groupType && `· ${sg.groupType}`}
          </div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>{sg.nom}</h2>
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
            {sg.days?.join(", ")} · {sg.time} · {sg.price} DA / {lang === "ar" ? "دورة" : "cycle"} ({sg.sessionsPerCycle} {lang === "ar" ? "حصص" : "séances"})
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowEditSg(true)} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
            <Edit2 size={14} /> {lang === "ar" ? "تعديل" : "Modifier"}
          </button>
        </div>
      </div>

      {/* ── Summary Stats Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase" }}>{lang === "ar" ? "إجمالي التلاميذ" : "Total élèves"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginTop: 2 }}>{students.length}</div>
          </div>
          <Users size={20} color="#818cf8" />
        </div>

        <div onClick={() => setTab("payments")} style={{ background: unpaidEnroll > 0 ? "rgba(251,191,36,0.1)" : "rgba(74,222,128,0.05)", border: `1px solid ${unpaidEnroll > 0 ? "rgba(251,191,36,0.3)" : "rgba(74,222,128,0.2)"}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: unpaidEnroll > 0 ? "#fbbf24" : "#4ade80", textTransform: "uppercase" }}>{lang === "ar" ? "تسجيل غير مدفوع" : "Inscriptions non payées"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: unpaidEnroll > 0 ? "#fbbf24" : "#4ade80", marginTop: 2 }}>{unpaidEnroll} {lang === "ar" ? "تلميذ" : "élèves"}</div>
          </div>
          <AlertTriangle size={20} color={unpaidEnroll > 0 ? "#fbbf24" : "#4ade80"} />
        </div>

        <div onClick={() => setTab("payments")} style={{ background: unpaidPmt > 0 ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.05)", border: `1px solid ${unpaidPmt > 0 ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.2)"}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: unpaidPmt > 0 ? "#f87171" : "#4ade80", textTransform: "uppercase" }}>{lang === "ar" ? "دورات غير مدفوعة" : "Cycles impayés"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: unpaidPmt > 0 ? "#f87171" : "#4ade80", marginTop: 2 }}>{unpaidPmt} {lang === "ar" ? "دورات" : "cycles"}</div>
          </div>
          <CreditCard size={20} color={unpaidPmt > 0 ? "#f87171" : "#4ade80"} />
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
        <Tab label={lang === "ar" ? "الحصص" : "Séances"}   icon={Calendar} active={tab === "sessions"} onClick={() => setTab("sessions")} />
        <Tab label={lang === "ar" ? "التلاميذ" : "Élèves"} icon={Users}    active={tab === "students"} onClick={() => setTab("students")} />
        <Tab label={lang === "ar" ? "الحضور" : "Présences"} icon={CheckCircle2} active={tab === "presences"} onClick={() => setTab("presences")} />
        <Tab label={lang === "ar" ? "المدفوعات" : "Paiements"} icon={CreditCard} active={tab === "payments"} onClick={() => setTab("payments")} badge={unpaidPmt + unpaidEnroll} />
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      {tab === "sessions" && (
        <SessionsList sessions={sessions} subgroup={sg} students={students} data={data} setData={setData} toastFn={toastFn} />
      )}

      {tab === "students" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <PrimaryBtn onClick={() => setShowAddStudent(true)}><Plus size={16} /> {lang === "ar" ? "+ تلميذ" : "+ Élève"}</PrimaryBtn>
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            {students.map(st => (
              <div key={st.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* Avatar */}
                <div style={{ width: 40, height: 40, borderRadius: 11, background: st.enrollmentPaid ? C.accentSoft : "rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: st.enrollmentPaid ? C.accent : "#fbbf24", flexShrink: 0 }}>
                  {st.prenom[0]}{st.nom[0]}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{st.prenom} {st.nom}</div>
                  <div className="f-mono" style={{ fontSize: 12, color: C.inkSoft }}>{st.phone || "—"}</div>
                </div>
                {/* Enrollment status */}
                <button
                  onClick={() => toggleEnrollment(st.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                    background: st.enrollmentPaid ? "rgba(74,222,128,0.15)" : "rgba(251,191,36,0.15)",
                    color: st.enrollmentPaid ? "#4ade80" : "#fbbf24",
                  }}
                >
                  {st.enrollmentPaid ? "✓ " + (lang === "ar" ? "تسجيل" : "Inscr.") : "⚠ " + (lang === "ar" ? "تسجيل" : "Inscr.")}
                </button>
                {/* Actions */}
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => onNav({ screen: "student", studentId: st.id })} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkSoft, cursor: "pointer" }}><ChevronRight size={14} /></button>
                  <button onClick={() => setEditingStudent(st)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkSoft, cursor: "pointer" }}><Edit2 size={13} /></button>
                  <button onClick={() => deleteStudent(st.id)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            {students.length === 0 && <div style={{ textAlign: "center", color: C.inkSoft, padding: "30px 0" }}>{lang === "ar" ? "لا يوجد تلاميذ" : "Aucun élève"}</div>}
          </div>
        </div>
      )}

      {tab === "presences" && (
        <PresencesTab subgroup={sg} students={students} data={data} />
      )}

      {tab === "payments" && (
        <PaymentsTab subgroup={sg} students={students} data={data} setData={setData} />
      )}

      {/* Modals */}
      {(showAddStudent || editingStudent) && (
        <StudentFormModal
          subgroupId={sg.id}
          initial={editingStudent}
          enrollmentFee={data.settings?.enrollmentFee || 500}
          onClose={() => { setShowAddStudent(false); setEditingStudent(null); }}
          onSave={saveStudent}
        />
      )}
      {showEditSg && (
        <SubgroupFormModal
          catId={sg.categoryId} levelId={sg.levelId} groupType={sg.groupType}
          initial={sg}
          onClose={() => setShowEditSg(false)}
          onSave={saveSubgroup}
        />
      )}
    </div>
  );
}
