import React, { useState } from "react";
import { Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { C, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";

export default function StudentCalendar({ student, group, data }) {
  const { lang } = useLanguage();
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = current.getFullYear();
  const month = current.getMonth();

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  if (!group) {
    return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "أنت غير مسجل في أي فوج" : "Vous n'êtes dans aucun sous-groupe."}</div>;
  }

  const cat = CAT_BY_ID[group.categoryId];
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Sessions du sous-groupe ce mois-ci
  const sessions = data.sessions
    .filter(s => s.groupId === group.id && s.date.startsWith(monthStr))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>
            {lang === "ar" ? "رزنامة الدروس" : "Mon Calendrier"}
          </h2>
          <div style={{ fontSize: 13, color: cat?.color || C.accent, fontWeight: 600, marginTop: 4 }}>
            {group.nom} {cat ? `· ${cat.label}` : ""} {group.levelId ? `· ${group.levelId}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              width: 38,
              height: 38,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            <ChevronLeft size={20} strokeWidth={2.5} color="#ffffff" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
            {current.toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              width: 38,
              height: 38,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            <ChevronRight size={20} strokeWidth={2.5} color="#ffffff" />
          </button>
        </div>
      </div>

      {/* Liste des séances du mois avec présence personnelle */}
      <div style={{ display: "grid", gap: 10 }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", color: C.inkSoft, padding: "30px 0", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 }}>
            {lang === "ar" ? "لا توجد حصص في هذا الشهر" : "Aucune séance ce mois-ci."}
          </div>
        ) : (
          sessions.map(sess => {
            // Trouver la présence propre à CET élève pour cette séance
            const attendance = (data.attendances || []).find(a => 
              a && a.studentId === student.id && 
              ((a.sessionId && a.sessionId === sess.id) || a.date === sess.date || a.originalDate === sess.date)
            );
            const isDone = sess.status === "done";
            const isCancelled = sess.status === "cancelled";
            const isCustom = !!(attendance?.customDate && attendance.customDate !== sess.date);

            return (
              <div
                key={sess.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  borderRadius: 16, background: isCustom ? "rgba(59,130,246,0.06)" : C.surface,
                  border: `1px solid ${isCustom ? "rgba(59,130,246,0.3)" : C.border}`,
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: isDone ? "rgba(74,222,128,0.15)" : isCancelled ? "rgba(248,113,113,0.15)" : "rgba(99,102,241,0.15)", border: `1px solid ${isDone ? "rgba(74,222,128,0.3)" : isCancelled ? "rgba(248,113,113,0.3)" : "rgba(99,102,241,0.3)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Clock size={13} color={isDone ? "#4ade80" : isCancelled ? "#f87171" : "#818cf8"} />
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: isDone ? "#4ade80" : isCancelled ? "#f87171" : "#818cf8", marginTop: 2 }}>{sess.time}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    
                    {isCustom && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#60a5fa", background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", padding: "2px 8px", borderRadius: 6 }}>
                        {lang === "ar" ? `حضور يوم ${attendance.customDate.slice(8)} بدل ${sess.date.slice(8)} 🔄` : `Présent le ${attendance.customDate.slice(8)} 🔄`}
                      </span>
                    )}

                    {sess.isExtra && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.accent, background: C.accentSoft, border: `1px solid rgba(226,150,58,0.35)`, padding: "2px 8px", borderRadius: 6 }}>
                        {lang === "ar" ? "حصة إضافية" : "Extra"}
                      </span>
                    )}
                  </div>
                  {sess.note && <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{sess.note}</div>}
                  {attendance?.note && <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 2 }}>• {attendance.note}</div>}
                </div>

                {/* Statut de présence de l'élève */}
                {isDone || attendance ? (
                  attendance?.present ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", fontSize: 13, fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> {lang === "ar" ? "حاضر" : "Présent"}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 13, fontWeight: 700 }}>
                      <XCircle size={16} /> {lang === "ar" ? "غائب" : "Absent"}
                    </div>
                  )
                ) : isCancelled ? (
                  <span style={{ fontSize: 12.5, color: "#f87171", fontWeight: 600 }}>{lang === "ar" ? "حصّة ملغاة" : "Séance annulée"}</span>
                ) : (
                  <span style={{ fontSize: 12.5, color: "#818cf8", fontWeight: 600 }}>{lang === "ar" ? "مقررة" : "Planifiée"}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
