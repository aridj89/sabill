import React, { useState } from "react";
import { Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { C, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";

export default function StudentCalendar({ student, subgroup, data }) {
  const { lang } = useLanguage();
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = current.getFullYear();
  const month = current.getMonth();

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  if (!subgroup) {
    return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "أنت غير مسجل في أي فوج" : "Vous n'êtes dans aucun sous-groupe."}</div>;
  }

  const cat = CAT_BY_ID[subgroup.categoryId];
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Sessions du sous-groupe ce mois-ci
  const sessions = data.sessions
    .filter(s => s.subgroupId === subgroup.id && s.date.startsWith(monthStr))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>
            {lang === "ar" ? "رزنامة الدروس" : "Mon Calendrier"}
          </h2>
          <div style={{ fontSize: 13, color: cat?.color || C.accent, fontWeight: 600, marginTop: 4 }}>
            {subgroup.nom} {cat ? `· ${cat.label}` : ""} {subgroup.levelId ? `· ${subgroup.levelId}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevMonth} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, cursor: "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
            {current.toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { month: "long", year: "numeric" })}
          </span>
          <button onClick={nextMonth} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, cursor: "pointer" }}>
            <ChevronRight size={16} />
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
            const attendance = data.attendances.find(a => a.sessionId === sess.id && a.studentId === student.id);
            const isDone = sess.status === "done";
            const isCancelled = sess.status === "cancelled";

            return (
              <div
                key={sess.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: isDone ? "rgba(74,222,128,0.15)" : isCancelled ? "rgba(248,113,113,0.15)" : "rgba(99,102,241,0.15)", border: `1px solid ${isDone ? "rgba(74,222,128,0.3)" : isCancelled ? "rgba(248,113,113,0.3)" : "rgba(99,102,241,0.3)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Clock size={13} color={isDone ? "#4ade80" : isCancelled ? "#f87171" : "#818cf8"} />
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: isDone ? "#4ade80" : isCancelled ? "#f87171" : "#818cf8", marginTop: 2 }}>{sess.time}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
                    {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    {sess.isExtra && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.accent, background: C.accentSoft, border: `1px solid rgba(226,150,58,0.35)`, padding: "2px 8px", borderRadius: 6 }}>
                        {lang === "ar" ? "حصة إضافية" : "Extra"}
                      </span>
                    )}
                  </div>
                  {sess.note && <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{sess.note}</div>}
                </div>

                {/* Statut de présence de l'élève */}
                {isDone ? (
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
