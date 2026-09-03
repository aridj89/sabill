import React, { useState, useMemo } from "react";
import {
  Users, CalendarCheck, AlertCircle, TrendingUp,
  CheckCircle2, XCircle, Clock, ChevronRight, CreditCard,
  MessageCircle, Phone, X
} from "lucide-react";
import { C, CAT_BY_ID, computeCycles } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, bg, border, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface, border: `1px solid ${border || C.border}`,
        borderRadius: 18, padding: "18px 20px",
        display: "flex", alignItems: "center", gap: 14,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = border || C.border)}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Session item ───────────────────────────────────────────── */
function SessionItem({ session, subgroup, onOpen }) {
  const cat = CAT_BY_ID[subgroup?.categoryId];
  const catColor = cat?.color || C.accent;

  return (
    <div
      onClick={onOpen}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px", borderRadius: 14,
        background: C.surface, border: `1px solid ${C.border}`,
        cursor: "pointer", transition: "all 0.15s",
        boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = catColor; e.currentTarget.style.transform = "translateX(3px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateX(0)"; }}
    >
      {/* Time */}
      <div style={{ width: 52, height: 52, borderRadius: 12, background: cat?.bg || C.accentSoft, border: `1px solid ${cat?.border || C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Clock size={13} color={catColor} />
        <span style={{ fontSize: 12, fontWeight: 800, color: catColor, marginTop: 2 }}>{session.time}</span>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subgroup?.nom}
        </div>
        <div style={{ fontSize: 12, color: catColor, fontWeight: 600, marginTop: 2 }}>
          {cat?.label} {subgroup?.levelId && `· ${subgroup.levelId}`} {subgroup?.groupType && `· ${subgroup.groupType}`}
        </div>
      </div>
      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{
          fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
          background: session.status === "done" ? "rgba(74,222,128,0.15)" : session.status === "cancelled" ? "rgba(248,113,113,0.15)" : "rgba(99,102,241,0.15)",
          color: session.status === "done" ? "#4ade80" : session.status === "cancelled" ? "#f87171" : "#818cf8",
          border: `1px solid ${session.status === "done" ? "rgba(74,222,128,0.3)" : session.status === "cancelled" ? "rgba(248,113,113,0.3)" : "rgba(99,102,241,0.3)"}`,
        }}>
          {session.status === "done" ? "✓" : session.status === "cancelled" ? "✗" : "●"}
        </span>
        <ChevronRight size={14} color={C.inkSoft} />
      </div>
    </div>
  );
}

import { notifyPaymentRequired } from "../../utils/notificationEngine";
import { uid } from "../../theme/tokens";

/* ─── Main component ─────────────────────────────────────────── */
export default function DashboardScreen({ data, setData, toastFn, onNav }) {
  const { lang } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const [unpaidModal, setUnpaidModal] = useState(null); // 'enrollment' | 'courses' | null

  const handleSendReminder = (studentId, amount, typeLabel) => {
    const student = data.students.find(s => s.id === studentId);
    if (!student) return;

    // Envoyer uniquement dans les NOTIFICATIONS (pas dans les messages)
    setData(d => {
      const notifs = notifyPaymentRequired(d, student.id, amount, typeLabel);
      return {
        ...d,
        // Nettoyer les éventuels anciens messages de rappel du chat
        privateMessages: (d.privateMessages || []).filter(m => !m.content?.includes("nous vous rappelons que vos frais")),
        userNotifications: notifs,
      };
    });

    if (toastFn) {
      toastFn(lang === "ar" 
        ? `تم إرسال إشعار التذكير بالدفع لـ ${student.prenom} ${student.nom || ""} بنجاح ✓` 
        : `Notification de rappel envoyée à ${student.prenom} ${student.nom || ""} ✓`
      );
    }
  };

  // ── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const { students, sessions, payments, subgroups } = data;

    const totalStudents = students.length;
    const enrollmentUnpaidStudents = students.filter(s => !s.enrollmentPaid);

    const todaySessions = sessions.filter(s => s.date === today).sort((a, b) => a.time.localeCompare(b.time));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStr = (d) => d.toISOString().slice(0, 10);
    const weekSessions = sessions.filter(s => s.date >= weekStr(weekStart) && s.date <= weekStr(weekEnd));

    // Déterminer la liste exacte des élèves en retard de paiement de cours
    const courseUnpaidList = [];
    subgroups.forEach(sg => {
      const cycles = computeCycles(sessions, sg);
      const studentsInSg = students.filter(s => s.subgroupId === sg.id);
      studentsInSg.forEach(st => {
        for (let c = 1; c <= cycles; c++) {
          const pmt = payments.find(p => p.studentId === st.id && p.subgroupId === sg.id && p.cycleNum === c);
          if (!pmt || !pmt.paid) {
            courseUnpaidList.push({
              student: st,
              subgroup: sg,
              cycleNum: c,
              amount: sg.price,
              paymentId: pmt?.id,
            });
          }
        }
      });
    });

    // Sessions done today
    const todayDone = todaySessions.filter(s => s.status === "done").length;

    return {
      totalStudents,
      enrollmentUnpaidList: enrollmentUnpaidStudents,
      todaySessions,
      weekSessions,
      courseUnpaidList,
      todayDone
    };
  }, [data, today]);

  const openSession = (sess) => {
    const sg = data.subgroups.find(s => s.id === sess.subgroupId);
    if (sg) onNav({ screen: "subgroup", subgroupId: sg.id, openSession: sess.id });
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h2 className="f-display" style={{ fontSize: 26, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
          {lang === "ar" ? "لوحة القيادة" : "Tableau de bord"}
        </h2>
        <p style={{ color: C.inkSoft, fontSize: 13.5, margin: "6px 0 0" }}>
          {new Date().toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 30 }}>
        <StatCard
          icon={Users}
          label={lang === "ar" ? "إجمالي التلاميذ (انقر لفتح الحسابات)" : "Total élèves (cliquer pour gérer)"}
          value={stats.totalStudents}
          color="#818cf8" bg="rgba(99,102,241,0.2)" border="rgba(99,102,241,0.35)"
          onClick={() => onNav && onNav({ screen: "parents" })}
        />
        <StatCard
          icon={CalendarCheck}
          label={lang === "ar" ? "حصص اليوم" : "Séances aujourd'hui"}
          value={stats.todaySessions.length}
          color="#4ade80" bg="rgba(74,222,128,0.18)" border="rgba(74,222,128,0.35)"
        />
        <StatCard
          icon={CreditCard}
          label={lang === "ar" ? "مدفوعات معلقة (انقر للتفاصيل)" : "Paiements en attente (cliquer)"}
          value={stats.courseUnpaidList.length}
          color="#f87171" bg="rgba(248,113,113,0.18)" border="rgba(248,113,113,0.35)"
          onClick={() => setUnpaidModal("courses")}
        />
        <StatCard
          icon={AlertCircle}
          label={lang === "ar" ? "تسجيل غير مدفوع (انقر للتفاصيل)" : "Inscriptions impayées (cliquer)"}
          value={stats.enrollmentUnpaidList.length}
          color="#fbbf24" bg="rgba(251,191,36,0.18)" border="rgba(251,191,36,0.35)"
          onClick={() => setUnpaidModal("enrollment")}
        />
      </div>

      {/* ── Today sessions ─────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 className="f-display" style={{ margin: 0, fontSize: 18, color: C.ink, fontWeight: 600 }}>
            {lang === "ar" ? "حصص اليوم" : "Séances d'aujourd'hui"}
          </h3>
          <span style={{ fontSize: 12, color: C.inkSoft, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 12px", fontWeight: 600 }}>
            {stats.todayDone}/{stats.todaySessions.length}
          </span>
        </div>

        {stats.todaySessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: C.inkSoft, fontSize: 14 }}>
            {lang === "ar" ? "لا توجد حصص اليوم" : "Aucune séance prévue aujourd'hui"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {stats.todaySessions.map(sess => {
              const sg = data.subgroups.find(s => s.id === sess.subgroupId);
              return <SessionItem key={sess.id} session={sess} subgroup={sg} onOpen={() => openSession(sess)} />;
            })}
          </div>
        )}
      </div>

      {/* ── This week ──────────────────────────────────────────── */}
      <div>
        <h3 className="f-display" style={{ margin: "0 0 14px", fontSize: 18, color: C.ink, fontWeight: 600 }}>
          {lang === "ar" ? "هذا الأسبوع" : "Cette semaine"}
          <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 400, marginLeft: 10 }}>
            {stats.weekSessions.length} {lang === "ar" ? "حصة" : "séances"}
          </span>
        </h3>

        {/* Quick week overview per day */}
        {["lundi","mardi","mercredi","jeudi","vendredi","samedi"].map(dayName => {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
          const dayDate = new Date(weekStart);
          const dayIdx = ["lundi","mardi","mercredi","jeudi","vendredi","samedi"].indexOf(dayName);
          dayDate.setDate(weekStart.getDate() + dayIdx);
          const dateStr = dayDate.toISOString().slice(0, 10);
          const daySessions = data.sessions.filter(s => s.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
          if (daySessions.length === 0) return null;

          return (
            <div key={dayName} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                {dayDate.toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                {dateStr === today && (
                  <span style={{ marginLeft: 8, background: "rgba(226,150,58,0.2)", border: "1px solid rgba(226,150,58,0.4)", color: C.accent, borderRadius: 999, padding: "2px 8px", fontSize: 10 }}>
                    {lang === "ar" ? "اليوم" : "Aujourd'hui"}
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {daySessions.slice(0, 4).map(sess => {
                  const sg = data.subgroups.find(s => s.id === sess.subgroupId);
                  return <SessionItem key={sess.id} session={sess} subgroup={sg} onOpen={() => openSession(sess)} />;
                })}
                {daySessions.length > 4 && (
                  <div style={{ fontSize: 12, color: C.inkSoft, padding: "4px 0" }}>
                    +{daySessions.length - 4} {lang === "ar" ? "حصة أخرى" : "de plus"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL UNPAID DETAILS ("CHKUN MSLKCH") ── */}
      {unpaidModal && (
        <Modal
          title={unpaidModal === "courses" 
            ? (lang === "ar" ? "قائمة غير المسددين للدروس" : "Liste des impayés de cours")
            : (lang === "ar" ? "قائمة غير المسددين للتسجيل" : "Liste des inscriptions non payées")
          }
          onClose={() => setUnpaidModal(null)}
          wide
        >
          {unpaidModal === "courses" ? (
            stats.courseUnpaidList.length === 0 ? (
              <div style={{ textAlign: "center", color: C.good, padding: "20px 0", fontWeight: 700 }}>
                {lang === "ar" ? "الجميع مسدد لجميع المستحقات! ✓" : "Tous les étudiants sont à jour de paiement ! ✓"}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: 400, overflowY: "auto" }}>
                {stats.courseUnpaidList.map((item, idx) => (
                  <div key={idx} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{item.student.prenom} {item.student.nom}</div>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                        {item.subgroup.nom} · <span style={{ color: "#f87171", fontWeight: 700 }}>{item.amount} DA</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }} className="f-mono">{item.student.phone}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => { setUnpaidModal(null); onNav({ screen: "student", studentId: item.student.id }); }}
                        style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {lang === "ar" ? "الملف" : "Fiche"}
                      </button>
                      <button
                        onClick={() => handleSendReminder(item.student.id, item.amount, "de cours")}
                        style={{ padding: "6px 12px", borderRadius: 8, background: C.accentSoft, border: `1px solid ${C.accent}`, color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <MessageCircle size={13} />
                        {lang === "ar" ? "تذكير" : "Rappel"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            stats.enrollmentUnpaidList.length === 0 ? (
              <div style={{ textAlign: "center", color: C.good, padding: "20px 0", fontWeight: 700 }}>
                {lang === "ar" ? "الجميع مسدد لحقوق التسجيل! ✓" : "Tous les étudiants ont réglé l'inscription ! ✓"}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: 400, overflowY: "auto" }}>
                {stats.enrollmentUnpaidList.map(st => {
                  const sg = data.subgroups.find(s => s.id === st.subgroupId);
                  return (
                    <div key={st.id} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{st.prenom} {st.nom}</div>
                        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                          {sg?.nom || "—"} · <span style={{ color: "#fbbf24", fontWeight: 700 }}>{data.settings?.enrollmentFee || 500} DA ({lang === "ar" ? "تسجيل" : "Inscription"})</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }} className="f-mono">{st.phone}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { setUnpaidModal(null); onNav({ screen: "student", studentId: st.id }); }}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          {lang === "ar" ? "الملف" : "Fiche"}
                        </button>
                        <button
                          onClick={() => handleSendReminder(st.id, data.settings?.enrollmentFee || 500, "d'inscription")}
                          style={{ padding: "6px 12px", borderRadius: 8, background: C.accentSoft, border: `1px solid ${C.accent}`, color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <MessageCircle size={13} />
                          {lang === "ar" ? "تذكير" : "Rappel"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </Modal>
      )}
    </div>
  );
}
