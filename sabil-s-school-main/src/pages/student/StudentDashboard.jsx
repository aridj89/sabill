import React, { useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, CalendarClock, Clock, CreditCard, Users, TrendingUp } from "lucide-react";
import { C, CAT_BY_ID, computeCycles } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";

export default function StudentDashboard({ student, subgroup, data }) {
  const { lang } = useLanguage();
  const cat = subgroup ? CAT_BY_ID[subgroup.categoryId] : null;

  const stats = useMemo(() => {
    if (!subgroup) return { total: 0, done: 0, presenceRate: 0, payments: [] };

    const attendances = data.attendances.filter(a => a.studentId === student.id);
    const totalDoneSessions = attendances.length;
    const presentCount = attendances.filter(a => a.present).length;
    const presenceRate = totalDoneSessions > 0 ? Math.round((presentCount / totalDoneSessions) * 100) : 0;
    
    // Prochaines séances du sous-groupe (non effectuées)
    const today = new Date().toISOString().slice(0, 10);
    const allSgSessions = data.sessions.filter(s => s.subgroupId === subgroup.id);
    const upcoming = allSgSessions
      .filter(s => s.date >= today && s.status === "planned")
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 3);
      
    // Historique 3 dernières
    const recent = allSgSessions
      .filter(s => s.status === "done" || s.status === "cancelled")
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, 3);

    // Paiements
    const payments = data.payments.filter(p => p.studentId === student.id).sort((a, b) => b.cycleNum - a.cycleNum);
    
    // Cycle en cours
    const currentCycle = computeCycles(allSgSessions, subgroup) + 1;
    const sessionsInCurrentCycle = allSgSessions.filter(s => s.status === "done").length % (subgroup.sessionsPerCycle || 4);

    return { totalDoneSessions, presentCount, presenceRate, upcoming, recent, payments, currentCycle, sessionsInCurrentCycle };
  }, [data, student, subgroup]);

  if (!subgroup) return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "أنت غير مسجل في أي فوج" : "Vous n'êtes inscrit dans aucun groupe."}</div>;

  return (
    <div>
      <h2 className="f-display" style={{ fontSize: 26, fontWeight: 700, color: C.ink, margin: "0 0 24px" }}>
        {lang === "ar" ? "مرحباً" : "Bonjour"}, {student.prenom}
      </h2>

      {/* ── Status Banner (Inscription) ── */}
      {!student.enrollmentPaid && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", marginBottom: 24 }}>
          <AlertTriangle size={24} color="#fbbf24" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>{lang === "ar" ? "حقوق التسجيل غير مدفوعة" : "Frais d'inscription impayés"}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              {lang === "ar" ? "يرجى تسوية حقوق التسجيل الخاصة بك" : "Veuillez régler vos frais d'inscription annuels."} ({data.settings?.enrollmentFee || 500} DA)
            </div>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        
        {/* Col 1 */}
        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          
          {/* Card: Ma progression / Présences */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={18} color={C.accent} />
              {lang === "ar" ? "نسبة الحضور" : "Assiduité"}
            </h3>
            
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: `4px solid ${stats.presenceRate >= 75 ? "#4ade80" : stats.presenceRate >= 50 ? "#fbbf24" : "#f87171"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{stats.presenceRate}%</span>
              </div>
              <div>
                <div style={{ fontSize: 14, color: C.inkSoft }}>{stats.totalDoneSessions} {lang === "ar" ? "حصة منجزة" : "séances effectuées"}</div>
                <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 4 }}>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>{stats.presentCount} {lang === "ar" ? "حاضر" : "présent"}</span>
                  {" · "}
                  <span style={{ color: "#f87171", fontWeight: 700 }}>{stats.totalDoneSessions - stats.presentCount} {lang === "ar" ? "غائب" : "absent"}</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 8 }}>{lang === "ar" ? "تقدم الدورة الحالية (الدورة" : "Progression cycle actuel (Cycle"} {stats.currentCycle})</div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", background: C.accent, width: `${(stats.sessionsInCurrentCycle / (subgroup.sessionsPerCycle || 4)) * 100}%` }} />
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "right", marginTop: 4 }}>
                {stats.sessionsInCurrentCycle} / {subgroup.sessionsPerCycle || 4} {lang === "ar" ? "حصص" : "séances"}
              </div>
            </div>
          </div>

          {/* Card: Prochaines séances */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarClock size={18} color="#818cf8" />
              {lang === "ar" ? "البرنامج القادم" : "Prochaines séances"}
            </h3>
            {stats.upcoming.length === 0 ? (
              <div style={{ fontSize: 13, color: C.inkSoft }}>{lang === "ar" ? "لا توجد حصص مبرمجة قريباً" : "Aucune séance programmée"}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {stats.upcoming.map(sess => (
                  <div key={sess.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <Clock size={12} color="#818cf8" />
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#818cf8", marginTop: 2 }}>{sess.time}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                        {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                        {sess.isExtra && (
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.accent, background: C.accentSoft, border: `1px solid rgba(226,150,58,0.3)`, padding: "2px 7px", borderRadius: 6 }}>
                            {lang === "ar" ? "حصة إضافية" : "Extra"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                        {subgroup.nom} {cat ? `· ${cat.label}` : ""} {sess.note ? `· ${sess.note}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col 2 */}
        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          
          {/* Card: Paiements */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} color="#f87171" />
              {lang === "ar" ? "حالة الدفع" : "Mes paiements"}
            </h3>
            {stats.payments.length === 0 ? (
              <div style={{ fontSize: 13, color: C.inkSoft }}>{lang === "ar" ? "لا توجد دورات مكتملة" : "Aucun cycle de paiement complété."}</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {stats.payments.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: p.paid ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.08)", border: `1px solid ${p.paid ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.3)"}`, borderRadius: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{lang === "ar" ? "دورة" : "Cycle"} {p.cycleNum}</div>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{p.amount} DA</div>
                    </div>
                    {p.paid ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={16} /> {lang === "ar" ? "مدفوع" : "Payé"}</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171", display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={16} /> {lang === "ar" ? "غير مدفوع" : "En attente"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
