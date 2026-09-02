import React, { useState } from "react";
import { CheckCircle2, XCircle, Clock, Calendar, Edit2, X, Save } from "lucide-react";
import { C, inputStyle, uid, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function SessionDetailModal({ session, subgroup, students, attendances, onClose, onSave }) {
  const { lang } = useLanguage();
  const cat = CAT_BY_ID[subgroup?.categoryId];

  // Local attendance state
  const initAtt = () => {
    const map = {};
    students.forEach(s => {
      const existing = attendances.find(a => a.sessionId === session.id && a.studentId === s.id);
      map[s.id] = existing ? existing.present : true; // default: présent
    });
    return map;
  };

  const [attMap, setAttMap] = useState(initAtt);
  const [note, setNote]     = useState(session.note || "");
  const [status, setStatus] = useState(session.status);
  const [editDate, setEditDate] = useState(false);
  const [date, setDate]     = useState(session.date);
  const [time, setTime]     = useState(session.time);
  const [dirty, setDirty]   = useState(false);

  const toggle = (sid) => {
    setAttMap(p => ({ ...p, [sid]: !p[sid] }));
    setDirty(true);
  };

  const presentCount = Object.values(attMap).filter(Boolean).length;
  const absentCount  = students.length - presentCount;

  const handleSave = () => {
    // Build attendance records
    const newAttendances = students.map(s => {
      const existing = attendances.find(a => a.sessionId === session.id && a.studentId === s.id);
      return {
        id: existing?.id || uid(),
        sessionId: session.id,
        studentId: s.id,
        present: attMap[s.id] ?? true,
      };
    });

    const updatedSession = { ...session, status, note, date, time };
    onSave(updatedSession, newAttendances);
  };

  const statusColors = {
    planned:   { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.4)", color: "#818cf8", label: lang === "ar" ? "مقررة" : "Planifiée" },
    done:      { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ade80", label: lang === "ar" ? "منجزة" : "Effectuée" },
    cancelled: { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.4)", color: "#f87171", label: lang === "ar" ? "ملغاة" : "Annulée" },
  };

  const sc = statusColors[status];
  const catColor = cat?.color || C.accent;

  return (
    <Modal
      title={lang === "ar" ? "تفاصيل الحصة" : "Détail de la séance"}
      onClose={onClose}
      wide
    >
      {/* Session info header */}
      <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
        {/* Subgroup breadcrumb */}
        <div style={{ fontSize: 12, color: catColor, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          {cat && <cat.icon size={12} />}
          {cat?.label} {subgroup?.levelId && `· ${subgroup.levelId}`} {subgroup?.groupType && `· ${subgroup.groupType}`} · {subgroup?.nom}
        </div>

        {/* Date & time */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} color={C.inkSoft} />
            {editDate ? (
              <input type="date" value={date} onChange={e => { setDate(e.target.value); setDirty(true); }}
                style={{ ...inputStyle, width: 150, padding: "4px 8px", fontSize: 13 }} />
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{date}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} color={C.inkSoft} />
            {editDate ? (
              <input type="time" value={time} onChange={e => { setTime(e.target.value); setDirty(true); }}
                style={{ ...inputStyle, width: 120, padding: "4px 8px", fontSize: 13 }} />
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{time}</span>
            )}
          </div>
          <button onClick={() => setEditDate(v => !v)} style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 4 }}>
            <Edit2 size={13} />
          </button>
        </div>
      </div>

      {/* Status selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.entries(statusColors).map(([key, val]) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setDirty(true); }}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              border: `1.5px solid ${status === key ? val.border : "rgba(255,255,255,0.15)"}`,
              background: status === key ? val.bg : "rgba(255,255,255,0.05)",
              color: status === key ? val.color : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Attendance section */}
      {status !== "cancelled" && students.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {lang === "ar" ? "الحضور" : "Présences"}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 12.5 }}>
              <span style={{ color: "#4ade80", fontWeight: 700 }}>{presentCount} ✓</span>
              <span style={{ color: "#f87171", fontWeight: 700 }}>{absentCount} ✗</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 7, maxHeight: 260, overflowY: "auto" }}>
            {students.map(s => {
              const present = attMap[s.id] ?? true;
              return (
                <div
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 12, cursor: "pointer",
                    background: present ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                    border: `1px solid ${present ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: present ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5, color: present ? "#4ade80" : "#f87171", flexShrink: 0 }}>
                    {s.prenom[0]}{s.nom[0]}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.ink }}>
                    {s.prenom} {s.nom}
                  </span>
                  {present
                    ? <CheckCircle2 size={20} color="#4ade80" />
                    : <XCircle     size={20} color="#f87171" />
                  }
                </div>
              );
            })}
          </div>
        </>
      )}

      {students.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: C.inkSoft, fontSize: 13 }}>
          {lang === "ar" ? "لا يوجد تلاميذ في هذه المجموعة" : "Aucun élève dans ce sous-groupe"}
        </div>
      )}

      {/* Note */}
      <div style={{ marginTop: 14 }}>
        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          {lang === "ar" ? "ملاحظة (اختياري)" : "Remarque (optionnel)"}
        </label>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); setDirty(true); }}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder={lang === "ar" ? "موضوع الحصة…" : "Sujet de la séance…"}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <PrimaryBtn full onClick={handleSave}>
          <Save size={15} />
          {lang === "ar" ? "حفظ الحصة" : "Enregistrer la séance"}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
