import React, { useState, useMemo } from "react";
import {
  Users, CalendarCheck, AlertCircle, TrendingUp,
  CheckCircle2, XCircle, Clock, ChevronRight, CreditCard,
  MessageCircle, Phone, X, Radio
} from "lucide-react";
import { C, CAT_BY_ID, computeCycles } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import { notifyPaymentRequired } from "../../utils/notificationEngine";
import { uid, getStudentFinancialSummary } from "../../theme/tokens";
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
function SessionItem({ session, group, onOpen }) {
  const cat = CAT_BY_ID[group?.categoryId];
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
          {group?.nom}
        </div>
        <div style={{ fontSize: 12, color: catColor, fontWeight: 600, marginTop: 2 }}>
          {cat?.label} {group?.levelId && `· ${group.levelId}`} {group?.groupType && `· ${group.groupType}`}
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

/* ─── Main component ─────────────────────────────────────────── */
export default function DashboardScreen({ data, setData, toastFn, onNav, activeYearId }) {
  const { lang } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const [unpaidModal, setUnpaidModal] = useState(null); // 'debts' | null
  const [nfcModal, setNfcModal] = useState(false);

  const handleSendReminder = (studentId, amount, typeLabel) => {
    const student = data.students.find(s => s.id === studentId);
    if (!student) return;

    setData(d => {
      const notifs = notifyPaymentRequired(d, student.id, amount, typeLabel);
      return {
        ...d,
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
    const { students, sessions } = data;

    // Filter students active in this year (enrolled or with carryover debt)
    const activeStudents = students.filter(st => {
      const isEnrolled = (data.enrollments || []).some(e => e.studentId === st.id && (!activeYearId || e.academicYearId === activeYearId));
      const hasDebt = (data.debtCarryOvers || []).some(c => c.studentId === st.id && (!activeYearId || c.toYearId === activeYearId || c.toYearId === "manual"));
      return isEnrolled || hasDebt;
    });

    const totalStudents = activeStudents.length;
    const studentsWithoutNfc = activeStudents.filter(s => !s.nfcCardId);
    const todaySessions = sessions.filter(s => s.date === today && (!activeYearId || s.academicYearId === activeYearId || !s.academicYearId)).sort((a, b) => a.time.localeCompare(b.time));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStr = (d) => d.toISOString().slice(0, 10);
    const weekSessions = sessions.filter(s => s.date >= weekStr(weekStart) && s.date <= weekStr(weekEnd) && (!activeYearId || s.academicYearId === activeYearId || !s.academicYearId));

    let totalDebtValue = 0;
    let totalPreviousDebt = 0;
    let totalCurrentFees = 0;
    let totalPaid = 0;
    const unpaidStudentsList = [];
    
    activeStudents.forEach(st => {
      const fin = getStudentFinancialSummary(data, st.id, activeYearId);
      totalPreviousDebt += fin.previousDebtRemaining;
      totalCurrentFees += fin.currentFeesRemaining;
      totalPaid += fin.totalPaid;
      if (fin.totalUnpaid > 0) {
        totalDebtValue += fin.totalUnpaid;
        unpaidStudentsList.push({
          student: st,
          amount: fin.totalUnpaid,
          previousDebt: fin.previousDebtRemaining,
          currentFees: fin.currentFeesRemaining,
        });
      }
    });

    const todayDone = todaySessions.filter(s => s.status === "done").length;

    return {
      totalStudents,
      studentsWithoutNfc,
      todaySessions,
      weekSessions,
      unpaidStudentsList,
      totalDebtValue,
      totalPreviousDebt,
      totalCurrentFees,
      totalPaid,
      todayDone
    };
  }, [data, today, activeYearId]);

  const openSession = (sess) => {
    const g = (data.groups || []).find(s => s.id === (sess.groupId || sess.subgroupId));
    if (g) onNav({ screen: "group", groupId: g.id, openSession: sess.id });
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
        <StatCard
          icon={Users}
          label={lang === "ar" ? "إجمالي التلاميذ" : "Total élèves"}
          value={stats.totalStudents}
          color="#818cf8" bg="rgba(99,102,241,0.2)" border="rgba(99,102,241,0.35)"
          onClick={() => onNav && onNav({ screen: "parents" })}
        />
        <StatCard
          icon={Radio}
          label={lang === "ar" ? "بدون بطاقة NFC" : "Sans carte NFC"}
          value={stats.studentsWithoutNfc.length}
          color="#f59e0b" bg="rgba(245,158,11,0.18)" border="rgba(245,158,11,0.35)"
          onClick={() => setNfcModal(true)}
        />
        <StatCard
          icon={CalendarCheck}
          label={lang === "ar" ? "حصص اليوم" : "Séances aujourd'hui"}
          value={stats.todaySessions.length}
          color="#4ade80" bg="rgba(74,222,128,0.18)" border="rgba(74,222,128,0.35)"
        />
        <StatCard
          icon={CreditCard}
          label={lang === "ar" ? "إجمالي الديون (DA)" : "Dette Totale (DA)"}
          value={stats.totalDebtValue.toLocaleString()}
          color="#f87171" bg="rgba(248,113,113,0.18)" border="rgba(248,113,113,0.35)"
          onClick={() => setUnpaidModal("debts")}
        />
        <StatCard
          icon={AlertCircle}
          label={lang === "ar" ? "طلاب لديهم ديون (انقر)" : "Élèves endettés (cliquer)"}
          value={stats.unpaidStudentsList.length}
          color="#fbbf24" bg="rgba(251,191,36,0.18)" border="rgba(251,191,36,0.35)"
          onClick={() => setUnpaidModal("debts")}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 30 }}>
        <StatCard
          icon={TrendingUp}
          label={lang === "ar" ? "ديون سابقة متبقية" : "Ancienne dette"}
          value={stats.totalPreviousDebt.toLocaleString()}
          color="#f87171" bg="rgba(248,113,113,0.18)" border="rgba(248,113,113,0.35)"
        />
        <StatCard
          icon={CreditCard}
          label={lang === "ar" ? "رسوم السنة الحالية" : "Frais actuels restants"}
          value={stats.totalCurrentFees.toLocaleString()}
          color="#fbbf24" bg="rgba(251,191,36,0.18)" border="rgba(251,191,36,0.35)"
        />
        <StatCard
          icon={CheckCircle2}
          label={lang === "ar" ? "إجمالي المسدد" : "Total payé"}
          value={stats.totalPaid.toLocaleString()}
          color="#4ade80" bg="rgba(74,222,128,0.18)" border="rgba(74,222,128,0.35)"
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
              const g = (data.groups || []).find(s => s.id === (sess.groupId || sess.subgroupId));
              return <SessionItem key={sess.id} session={sess} group={g} onOpen={() => openSession(sess)} />;
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
                  const g = (data.groups || []).find(s => s.id === (sess.groupId || sess.subgroupId));
                  return <SessionItem key={sess.id} session={sess} group={g} onOpen={() => openSession(sess)} />;
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

      {/* ── MODAL UNPAID DETAILS ── */}
      {unpaidModal && (
        <Modal
          title={lang === "ar" ? "قائمة غير المسددين للديون" : "Liste des impayés"}
          onClose={() => setUnpaidModal(null)}
          wide
        >
          {stats.unpaidStudentsList.length === 0 ? (
            <div style={{ textAlign: "center", color: C.good, padding: "20px 0", fontWeight: 700 }}>
              {lang === "ar" ? "الجميع مسدد لجميع المستحقات! ✓" : "Tous les étudiants sont à jour de paiement ! ✓"}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, maxHeight: 400, overflowY: "auto" }}>
              {stats.unpaidStudentsList.map((item, idx) => (
                <div key={idx} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{item.student.prenom} {item.student.nom}</div>
                    <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                      <span style={{ color: "#f87171", fontWeight: 700 }}>{item.amount.toLocaleString()} DA</span>
                      {item.previousDebt > 0 && <span style={{ marginLeft: 6, opacity: 0.8 }}>(Préc: {item.previousDebt.toLocaleString()} DA)</span>}
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
                      onClick={() => handleSendReminder(item.student.id, item.amount, "des dettes")}
                      style={{ padding: "6px 12px", borderRadius: 8, background: C.accentSoft, border: `1px solid ${C.accent}`, color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <MessageCircle size={13} />
                      {lang === "ar" ? "تذكير" : "Rappel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
      {/* ── MODAL SANS CARTE NFC ── */}
      {nfcModal && (
        <Modal
          title={lang === "ar" ? "تلاميذ بدون بطاقة NFC" : "Élèves sans carte NFC"}
          onClose={() => setNfcModal(false)}
          wide
        >
          {stats.studentsWithoutNfc.length === 0 ? (
            <div style={{ textAlign: "center", color: "#4ade80", padding: "20px 0", fontWeight: 700 }}>
              {lang === "ar" ? "جميع التلاميذ لديهم بطاقات! ✓" : "Tous les élèves ont une carte NFC ! ✓"}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, maxHeight: 400, overflowY: "auto" }}>
              {stats.studentsWithoutNfc.map((st, idx) => (
                <div key={idx} style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{st.prenom} {st.nom}</div>
                    <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
                      <span className="f-mono">{st.phone || "—"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => { setNfcModal(false); onNav({ screen: "student", studentId: st.id }); }}
                      style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      {lang === "ar" ? "الملف" : "Fiche"}
                    </button>
                    <button
                      onClick={() => { setNfcModal(false); onNav({ screen: "nfc" }); }}
                      style={{ padding: "6px 12px", borderRadius: 8, background: C.accentSoft, border: `1px solid ${C.accent}`, color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Radio size={13} />
                      {lang === "ar" ? "إضافة بطاقة" : "Ajouter Carte"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
