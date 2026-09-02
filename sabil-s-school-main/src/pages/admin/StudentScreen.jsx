import React, { useState } from "react";
import { ArrowLeft, Edit2, CheckCircle2, XCircle, CreditCard, CalendarDays, TrendingUp } from "lucide-react";
import { C, CAT_BY_ID, computeCycles } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import StudentFormModal from "./StudentFormModal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function StudentScreen({ studentId, data, setData, toastFn, onBack }) {
  const { lang } = useLanguage();
  const [showEdit, setShowEdit] = useState(false);

  const st = data.students.find(s => s.id === studentId);
  if (!st) return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "التلميذ غير موجود" : "Élève introuvable"}</div>;

  const sg = data.subgroups.find(s => s.id === st.subgroupId);
  const cat = sg ? CAT_BY_ID[sg.categoryId] : null;

  // Stats & data
  const attendances = data.attendances.filter(a => a.studentId === st.id);
  const totalSessions = attendances.length;
  const presentCount = attendances.filter(a => a.present).length;
  const absentCount = totalSessions - presentCount;
  const presenceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  const payments = data.payments.filter(p => p.studentId === st.id).sort((a, b) => a.cycleNum - b.cycleNum);
  const unpaidPmtCount = payments.filter(p => !p.paid).length;

  const saveStudent = (student) => {
    setData(d => ({ ...d, students: d.students.map(s => s.id === student.id ? student : s) }));
    setShowEdit(false);
    if (toastFn) toastFn(lang === "ar" ? "تم تعديل التلميذ ✓" : "Élève modifié ✓");
  };

  const togglePaid = (pId) => {
    setData(d => ({
      ...d,
      payments: d.payments.map(p => p.id === pId ? { ...p, paid: !p.paid, paidDate: !p.paid ? new Date().toISOString().slice(0, 10) : null } : p),
    }));
  };

  return (
    <div>
      <button onClick={onBack} style={{ border: "none", background: "none", color: C.inkSoft, display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: 0 }}>
        <ArrowLeft size={15} /> {lang === "ar" ? "رجوع" : "Retour"}
      </button>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: st.enrollmentPaid ? C.accentSoft : "rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24, color: st.enrollmentPaid ? C.accent : "#fbbf24", flexShrink: 0 }}>
            {st.prenom[0]}{st.nom[0]}
          </div>
          <div>
            <h2 className="f-display" style={{ fontSize: 28, fontWeight: 700, color: C.ink, margin: 0 }}>
              {st.prenom} {st.nom}
            </h2>
            <div className="f-mono" style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4 }}>
              {st.phone || (lang === "ar" ? "لا يوجد هاتف" : "Aucun téléphone")}
              {" · "}
              <span style={{ background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 6, fontSize: 12 }}>
                {lang === "ar" ? "كلمة المرور:" : "Mdp:"} <code style={{ color: C.accent }}>{st.password || "123456"}</code>
              </span>
            </div>
            {sg && cat && (
              <div style={{ fontSize: 12.5, color: cat.color, fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <cat.icon size={13} />
                {cat.label} {sg.levelId && `· ${sg.levelId}`} {sg.groupType && `· ${sg.groupType}`} · {sg.nom}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onNav && onNav({ screen: "chat", studentId: st.id })}
            style={{ background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 10, padding: "7px 12px", color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}
          >
            {lang === "ar" ? "رسالة خاصة" : "Message privé"}
          </button>
          <button onClick={() => setShowEdit(true)} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
            <Edit2 size={14} /> {lang === "ar" ? "تعديل" : "Modifier"}
          </button>
        </div>
      </div>

      {/* ── Status badges ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Enrollment */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: st.enrollmentPaid ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)", border: `1px solid ${st.enrollmentPaid ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.3)"}` }}>
          {st.enrollmentPaid ? <CheckCircle2 size={18} color="#4ade80" /> : <AlertTriangle size={18} color="#fbbf24" />}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: st.enrollmentPaid ? "#4ade80" : "#fbbf24", textTransform: "uppercase" }}>
              {lang === "ar" ? "التسجيل" : "Inscription"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
              {st.enrollmentPaid ? (lang === "ar" ? "مدفوع ✓" : "Payé ✓") : (lang === "ar" ? "غير مدفوع ⚠" : "Impayé ⚠")}
            </div>
          </div>
        </div>

        {/* Courses Payments */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: unpaidPmtCount === 0 ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", border: `1px solid ${unpaidPmtCount === 0 ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
          {unpaidPmtCount === 0 ? <CheckCircle2 size={18} color="#4ade80" /> : <XCircle size={18} color="#f87171" />}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: unpaidPmtCount === 0 ? "#4ade80" : "#f87171", textTransform: "uppercase" }}>
              {lang === "ar" ? "الدورات" : "Cours"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
              {unpaidPmtCount === 0 ? (lang === "ar" ? "مدفوع ✓" : "À jour ✓") : `${unpaidPmtCount} ${lang === "ar" ? "غير مدفوع ⚠" : "impayé(s) ⚠"}`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ── Left col: Stats & Attendance ────────────────────── */}
        <div>
          <h3 className="f-display" style={{ margin: "0 0 14px", fontSize: 18, color: C.ink, fontWeight: 600 }}>
            {lang === "ar" ? "الحضور" : "Présences"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{lang === "ar" ? "معدل الحضور" : "Taux de présence"}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: presenceRate >= 75 ? "#4ade80" : "#fbbf24", marginTop: 4 }}>{presenceRate}%</div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{lang === "ar" ? "الغيابات" : "Absences"}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: absentCount > 0 ? "#f87171" : "#4ade80", marginTop: 4 }}>{absentCount}</div>
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", maxHeight: 300, overflowY: "auto" }}>
            {attendances.length === 0 ? (
              <div style={{ textAlign: "center", color: C.inkSoft, fontSize: 13 }}>{lang === "ar" ? "لا يوجد سجل حضور" : "Aucun historique"}</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {[...attendances].reverse().map(att => {
                  const sess = data.sessions.find(s => s.id === att.sessionId);
                  if (!sess) return null;
                  return (
                    <div key={att.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                          {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.inkSoft }}>{sess.time}</div>
                      </div>
                      {att.present ? <CheckCircle2 size={18} color="#4ade80" /> : <XCircle size={18} color="#f87171" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right col: Payments ────────────────────────────── */}
        <div>
          <h3 className="f-display" style={{ margin: "0 0 14px", fontSize: 18, color: C.ink, fontWeight: 600 }}>
            {lang === "ar" ? "تاريخ المدفوعات (الدورات)" : "Historique des paiements"}
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {payments.length === 0 ? (
              <div style={{ textAlign: "center", color: C.inkSoft, padding: "20px 0", fontSize: 13, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                {lang === "ar" ? "لا توجد دورات مكتملة" : "Aucun cycle complété"}
              </div>
            ) : (
              payments.map(p => (
                <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{lang === "ar" ? "دورة" : "Cycle"} {p.cycleNum}</div>
                    <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{p.amount} DA</div>
                  </div>
                  <button
                    onClick={() => togglePaid(p.id)}
                    style={{
                      padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, border: "none",
                      background: p.paid ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                      color: p.paid ? "#4ade80" : "#f87171",
                      cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {p.paid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {p.paid ? (lang === "ar" ? "مدفوع" : "Payé") : (lang === "ar" ? "غير مدفوع" : "Impayé")}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <StudentFormModal
          subgroupId={st.subgroupId}
          initial={st}
          enrollmentFee={data.settings?.enrollmentFee || 500}
          onClose={() => setShowEdit(false)}
          onSave={saveStudent}
        />
      )}
    </div>
  );
}

function AlertTriangle(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke={props.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
}
