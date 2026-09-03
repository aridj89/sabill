import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, X, Plus, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { C, CAT_BY_ID, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import SessionDetailModal from "./SessionDetailModal";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import { notifyExtraSessionAdded, notifySessionChange } from "../../utils/notificationEngine";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_AR = ["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS_HEADER_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const DAYS_HEADER_AR = ["الإث","الثل","الأر","الخم","الجم","السب","الأح"];

export default function CalendarScreen({ data, setData, toastFn, onNav }) {
  const { lang } = useLanguage();
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [openSession, setOpenSession] = useState(null);
  const [view, setView] = useState("month"); // month | list
  const [showAddSession, setShowAddSession] = useState(false);

  // New session form state
  const [newSessSgId, setNewSessSgId] = useState(data.subgroups[0]?.id || "");
  const [newSessDate, setNewSessDate] = useState(today.toISOString().slice(0, 10));
  const [newSessTime, setNewSessTime] = useState("14:00");
  const [newSessIsExtra, setNewSessIsExtra] = useState(true);
  const [newSessNote, setNewSessNote] = useState("");

  const handleCreateSession = () => {
    if (!newSessSgId || !newSessDate || !newSessTime) return;
    const sg = data.subgroups.find(s => s.id === newSessSgId);
    const sessId = uid();
    const newSession = {
      id: sessId,
      subgroupId: newSessSgId,
      date: newSessDate,
      time: newSessTime,
      isExtra: newSessIsExtra,
      note: newSessNote.trim(),
      status: "planned",
    };

    setData(d => {
      const sessions = [...(d.sessions || []), newSession];
      let extraSessions = d.extraSessions || [];
      if (newSessIsExtra) {
        extraSessions = [...extraSessions, {
          id: sessId,
          subgroupId: newSessSgId,
          date: newSessDate,
          time: newSessTime,
          price: sg?.price || 0,
          isGroupPrice: false,
          note: newSessNote.trim(),
        }];
      }

      // Notify all students in this subgroup!
      let userNotifications = d.userNotifications || [];
      if (newSessIsExtra) {
        userNotifications = notifyExtraSessionAdded(d, newSessSgId, { date: newSessDate, time: newSessTime, note: newSessNote.trim() }, lang);
      } else {
        userNotifications = notifySessionChange(d, newSessSgId, "added", { date: newSessDate, time: newSessTime, note: newSessNote.trim() }, lang);
      }

      return {
        ...d,
        sessions,
        extraSessions,
        userNotifications,
      };
    });

    setShowAddSession(false);
    setNewSessNote("");
    if (toastFn) {
      toastFn(lang === "ar" ? "تمت إضافة الحصة وإرسال الإشعار للطلاب بنجاح ✓" : "Séance ajoutée et élèves notifiés ✓");
    }
  };

  const year  = current.getFullYear();
  const month = current.getMonth();

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  // Sessions in this month
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthSessions = data.sessions
    .filter(s => s.date.startsWith(monthStr))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // Adjust: week starts Monday
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7; // Sun → 7
  startDow -= 1; // Mon = 0

  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startDow + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const daySessions = monthSessions.filter(s => s.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
    return { dayNum, dateStr, sessions: daySessions };
  });

  const todayStr = today.toISOString().slice(0, 10);

  const saveSession = (updatedSess, newAttendances) => {
    setData(d => {
      const updatedSessions = d.sessions.map(s => s.id === updatedSess.id ? updatedSess : s);
      const sg = d.subgroups.find(x => x.id === updatedSess.subgroupId);
      const done = updatedSessions.filter(s => s.subgroupId === updatedSess.subgroupId && s.status === "done").length;
      const cycles = sg ? Math.floor(done / (sg.sessionsPerCycle || 4)) : 0;
      const otherAtt = d.attendances.filter(a => a.sessionId !== updatedSess.id);
      let payments = [...d.payments];
      if (sg) {
        const studentsInSg = d.students.filter(s => s.subgroupId === sg.id);
        studentsInSg.forEach(st => {
          for (let c = 1; c <= cycles; c++) {
            const has = payments.some(p => p.studentId === st.id && p.subgroupId === sg.id && p.cycleNum === c);
            if (!has) payments.push({ id: uid(), studentId: st.id, subgroupId: sg.id, cycleNum: c, amount: sg.price, paid: false, paidDate: null });
          }
        });
      }
      return { ...d, sessions: updatedSessions, attendances: [...otherAtt, ...newAttendances], payments };
    });
    setOpenSession(null);
    if (toastFn) toastFn(lang === "ar" ? "تم حفظ الحصة ✓" : "Séance enregistrée ✓");
  };

  const openSess = openSession ? data.sessions.find(s => s.id === openSession) : null;
  const openSg   = openSess   ? data.subgroups.find(sg => sg.id === openSess.subgroupId) : null;
  const openStud = openSg     ? data.students.filter(s => s.subgroupId === openSg.id) : [];

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>
          {lang === "ar" ? "الجدول الزمني" : "Calendrier global"}
        </h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PrimaryBtn onClick={() => setShowAddSession(true)}>
            <Plus size={15} />
            {lang === "ar" ? "إضافة حصة" : "Ajouter une séance"}
          </PrimaryBtn>

          {/* View toggle */}
          {["month","list"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${view === v ? "rgba(226,150,58,0.5)" : C.border}`, background: view === v ? "rgba(226,150,58,0.15)" : "rgba(255,255,255,0.05)", color: view === v ? C.accent : C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {v === "month" ? (lang === "ar" ? "شهر" : "Mois") : (lang === "ar" ? "قائمة" : "Liste")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <button onClick={prevMonth} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, cursor: "pointer" }}>
          <ChevronLeft size={16} />
        </button>
        <h3 className="f-display" style={{ margin: 0, fontSize: 20, color: C.ink, flex: 1, textAlign: "center" }}>
          {lang === "ar" ? MONTHS_AR[month] : MONTHS_FR[month]} {year}
        </h3>
        <button onClick={nextMonth} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, cursor: "pointer" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── Stats bar ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { label: lang === "ar" ? "حصص الشهر" : "Total", value: monthSessions.length, color: C.accent },
          { label: lang === "ar" ? "منجزة" : "Effectuées", value: monthSessions.filter(s => s.status === "done").length, color: "#4ade80" },
          { label: lang === "ar" ? "مقررة" : "Prévues", value: monthSessions.filter(s => s.status === "planned").length, color: "#818cf8" },
          { label: lang === "ar" ? "ملغاة" : "Annulées", value: monthSessions.filter(s => s.status === "cancelled").length, color: "#f87171" },
        ].map(stat => (
          <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: stat.color, fontSize: 16 }}>{stat.value}</span>
            <span style={{ color: C.inkSoft }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── MONTH VIEW ──────────────────────────────────────── */}
      {view === "month" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: 620 }}>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${C.border}` }}>
                {(lang === "ar" ? DAYS_HEADER_AR : DAYS_HEADER_FR).map(d => (
                  <div key={d} style={{ textAlign: "center", padding: "10px 0", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {cells.map((cell, idx) => {
                  if (!cell) return <div key={idx} style={{ minHeight: 90, borderRight: idx % 7 !== 6 ? `1px solid rgba(255,255,255,0.07)` : "none", borderBottom: `1px solid rgba(255,255,255,0.07)` }} />;
                  const isToday = cell.dateStr === todayStr;
                  const hasSess = cell.sessions.length > 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: 90, padding: "8px 6px",
                        borderRight: idx % 7 !== 6 ? `1px solid rgba(255,255,255,0.07)` : "none",
                        borderBottom: `1px solid rgba(255,255,255,0.07)`,
                        background: isToday ? "rgba(226,150,58,0.08)" : "transparent",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? C.accent : C.inkSoft, marginBottom: 5 }}>
                        {cell.dayNum}
                      </div>
                      {cell.sessions.slice(0, 3).map(sess => {
                        const sg  = data.subgroups.find(x => x.id === sess.subgroupId);
                        const cat = sg ? CAT_BY_ID[sg.categoryId] : null;
                        const stColor = sess.status === "done" ? "#4ade80" : sess.status === "cancelled" ? "#f87171" : cat?.color || C.accent;
                        return (
                          <div
                            key={sess.id}
                            onClick={() => setOpenSession(sess.id)}
                            style={{
                              fontSize: 11, fontWeight: 600, color: "#fff",
                              background: sess.status === "done" ? "rgba(74,222,128,0.2)" : sess.status === "cancelled" ? "rgba(248,113,113,0.15)" : cat?.bg || C.accentSoft,
                              border: `1px solid ${stColor}`,
                              borderRadius: 5, padding: "2px 5px", marginBottom: 3,
                              cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              transition: "opacity 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                            title={`${sess.time} · ${sg?.nom || ""}`}
                          >
                            {sess.time} {sg?.nom}
                          </div>
                        );
                      })}
                      {cell.sessions.length > 3 && (
                        <div style={{ fontSize: 10, color: C.inkSoft, textAlign: "center" }}>+{cell.sessions.length - 3}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────── */}
      {view === "list" && (
        <div style={{ display: "grid", gap: 8 }}>
          {monthSessions.length === 0 && (
            <div style={{ textAlign: "center", color: C.inkSoft, padding: "30px 0" }}>
              {lang === "ar" ? "لا توجد حصص هذا الشهر" : "Aucune séance ce mois-ci"}
            </div>
          )}
          {monthSessions.map(sess => {
            const sg  = data.subgroups.find(x => x.id === sess.subgroupId);
            const cat = sg ? CAT_BY_ID[sg.categoryId] : null;
            const stStyle = {
              planned:   { color: "#818cf8", bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.35)" },
              done:      { color: "#4ade80", bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.35)" },
              cancelled: { color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.35)" },
            }[sess.status];
            return (
              <div
                key={sess.id}
                onClick={() => setOpenSession(sess.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = cat?.color || C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: stStyle.bg, border: `1px solid ${stStyle.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Clock size={13} color={stStyle.color} />
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: stStyle.color, marginTop: 1 }}>{sess.time}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{sg?.nom || "—"}</div>
                  <div style={{ fontSize: 12, color: cat?.color || C.accent, fontWeight: 600, marginTop: 2 }}>
                    {cat?.label} {sg?.levelId && `· ${sg.levelId}`} {sg?.groupType && `· ${sg.groupType}`}
                    {" · "}
                    {new Date(sess.date + "T12:00").toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: stStyle.bg, color: stStyle.color, border: `1px solid ${stStyle.border}`, flexShrink: 0 }}>
                  {sess.status === "done" ? "✓" : sess.status === "cancelled" ? "✗" : "●"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Session Modal ────────────────────────────────────── */}
      {openSess && openSg && (
        <SessionDetailModal
          session={openSess}
          subgroup={openSg}
          students={openStud}
          attendances={data.attendances}
          onClose={() => setOpenSession(null)}
          onSave={saveSession}
        />
      )}
      {/* ── Add Session Modal ─────────────────────────────────── */}
      {showAddSession && (
        <Modal
          title={lang === "ar" ? "إضافة وبرمجة حصة جديدة" : "Programmer une nouvelle séance"}
          onClose={() => setShowAddSession(false)}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <Field label={lang === "ar" ? "الفوج المعني" : "Sous-groupe"}>
              <select
                style={inputStyle}
                value={newSessSgId}
                onChange={e => setNewSessSgId(e.target.value)}
              >
                {data.subgroups.map(sg => {
                  const cat = CAT_BY_ID[sg.categoryId];
                  return (
                    <option key={sg.id} value={sg.id}>
                      {sg.nom} ({cat ? cat.label : ""})
                    </option>
                  );
                })}
              </select>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label={lang === "ar" ? "التاريخ" : "Date"}>
                <input
                  type="date"
                  style={inputStyle}
                  value={newSessDate}
                  onChange={e => setNewSessDate(e.target.value)}
                />
              </Field>
              <Field label={lang === "ar" ? "الوقت" : "Heure"}>
                <input
                  type="time"
                  style={inputStyle}
                  value={newSessTime}
                  onChange={e => setNewSessTime(e.target.value)}
                />
              </Field>
            </div>

            {/* Type: Extra or Regular */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 12,
              background: newSessIsExtra ? "rgba(226,150,58,0.12)" : "rgba(99,102,241,0.12)",
              border: `1px solid ${newSessIsExtra ? "rgba(226,150,58,0.35)" : "rgba(99,102,241,0.35)"}`
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: newSessIsExtra ? C.accent : "#818cf8" }}>
                  {newSessIsExtra ? (lang === "ar" ? "حصة إضافية (Extra)" : "Séance supplémentaire (Extra)") : (lang === "ar" ? "حصة عادية" : "Séance normale")}
                </div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
                  {lang === "ar" ? "سيتم إشعار جميع تلاميذ هذا الفوج تلقائياً فور الحفظ" : "Tous les élèves du groupe recevront une notification"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewSessIsExtra(v => !v)}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "none",
                  background: newSessIsExtra ? C.accent : "rgba(255,255,255,0.15)",
                  color: "#fff", cursor: "pointer"
                }}
              >
                {newSessIsExtra ? (lang === "ar" ? "إضافية ✓" : "Extra ✓") : (lang === "ar" ? "عادية" : "Normale")}
              </button>
            </div>

            <Field label={lang === "ar" ? "ملاحظة / موضوع الحصة (اختياري)" : "Sujet / Note (optionnel)"}>
              <input
                style={inputStyle}
                placeholder={lang === "ar" ? "مثال: مراجعة شاملة للامتحان" : "Ex: Révision générale"}
                value={newSessNote}
                onChange={e => setNewSessNote(e.target.value)}
              />
            </Field>

            <div style={{ marginTop: 8 }}>
              <PrimaryBtn full onClick={handleCreateSession} disabled={!newSessSgId || !newSessDate || !newSessTime}>
                <Plus size={15} />
                {lang === "ar" ? "تأكيد وإشعار التلاميذ" : "Enregistrer et notifier"}
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
