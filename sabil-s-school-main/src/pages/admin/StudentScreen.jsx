import React, { useState, useMemo } from "react";
import {
  ArrowLeft, Edit2, CheckCircle2, XCircle, CreditCard, CalendarDays,
  TrendingUp, Shield, Key, Radio, Calendar, ChevronLeft, ChevronRight,
  Clock, Plus, RotateCcw, AlertCircle, Check, X, Trash2,
} from "lucide-react";
import { C, CAT_BY_ID, computeCycles, getStudentFinancialSummary, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import StudentFormModal from "./StudentFormModal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import { notifyPaymentReceived, notifyAccountUpdated, notifyPresenceChange } from "../../utils/notificationEngine";

function AlertTriangle(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/* ── Modal لتعديل تاريخ الحضور للتلميذ ────────────────────────── */
function EditAttendanceDateModal({ isOpen, onClose, student, sessionInfo, onSave }) {
  const { lang } = useLanguage();
  const [actualDate, setActualDate] = useState(
    sessionInfo?.actualDate || sessionInfo?.scheduledDate || new Date().toISOString().slice(0, 10)
  );
  const [present, setPresent] = useState(sessionInfo?.present ?? true);
  const [note, setNote] = useState(sessionInfo?.note || "");

  if (!isOpen) return null;
  const originalDate = sessionInfo?.scheduledDate;
  const isChanged = actualDate !== originalDate;

  return (
    <Modal
      title={lang === "ar" ? "تعديل تاريخ حضور التلميذ" : "Modifier la date de présence"}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Student info */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11.5, color: C.inkSoft }}>{lang === "ar" ? "التلميذ:" : "Élève :"}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{student?.prenom} {student?.nom}</div>
          {originalDate && (
            <div style={{ fontSize: 12, color: C.accent, marginTop: 4, fontWeight: 600 }}>
              📅 {lang === "ar" ? `التاريخ المبرمج أصلاً للحصة: ${originalDate}` : `Date prévue au calendrier : ${originalDate}`}
            </div>
          )}
        </div>

        {/* Presence status */}
        <div>
          <label style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, display: "block", marginBottom: 6 }}>
            {lang === "ar" ? "حالة الحضور:" : "Statut de présence :"}
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setPresent(true)}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${present ? "#4ade80" : C.border}`,
                background: present ? "rgba(74,222,128,0.15)" : "transparent",
                color: present ? "#4ade80" : C.inkSoft,
                fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <CheckCircle2 size={16} />
              {lang === "ar" ? "حاضر (Présent)" : "Présent"}
            </button>
            <button
              type="button"
              onClick={() => setPresent(false)}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${!present ? "#f87171" : C.border}`,
                background: !present ? "rgba(248,113,113,0.15)" : "transparent",
                color: !present ? "#f87171" : C.inkSoft,
                fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <XCircle size={16} />
              {lang === "ar" ? "غائب (Absent)" : "Absent"}
            </button>
          </div>
        </div>

        {/* Actual attendance date */}
        <div>
          <label style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, display: "block", marginBottom: 6 }}>
            {lang === "ar" ? "تاريخ الحضور الفعلي (مثلاً: حضر يوم 5 بدل 2):" : "Date réelle de présence :"}
          </label>
          <input
            type="date"
            value={actualDate}
            onChange={e => setActualDate(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.06)",
              border: `1.5px solid ${isChanged ? "#3b82f6" : C.border}`,
              borderRadius: 10, color: C.ink, fontSize: 14, fontWeight: 700,
              outline: "none", colorScheme: "dark",
            }}
          />
          {isChanged && (
            <div style={{ fontSize: 11.5, color: "#3b82f6", fontWeight: 700, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <RotateCcw size={12} />
              {lang === "ar"
                ? `سيتم تسجيل حضور التلميذ يوم ${actualDate} بدل ${originalDate}`
                : `Présence déplacée au ${actualDate} au lieu du ${originalDate}`}
            </div>
          )}
        </div>

        {/* Note / reason */}
        <div>
          <label style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, display: "block", marginBottom: 6 }}>
            {lang === "ar" ? "ملاحظة (سبب التغيير / تعويض):" : "Remarque / Rattrapage :"}
          </label>
          <input
            type="text"
            placeholder={lang === "ar" ? "مثال: حضر يوم 5 بدل 2 (حصة تعويضية)" : "ex: Présent le 5 au lieu du 2"}
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.ink, fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 10,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.inkSoft, fontWeight: 700, cursor: "pointer",
            }}
          >
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </button>
          <button
            type="button"
            onClick={() => onSave({ actualDate, present, note })}
            style={{
              flex: 1.5, padding: "10px 16px", borderRadius: 10,
              border: "none", background: C.accent,
              color: "#fff", fontWeight: 800, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(226,150,58,0.3)",
            }}
          >
            {lang === "ar" ? "حفظ التاريخ والحضور" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Modal لإضافة حصة تعويضية خاصة للتلميذ ─────────────────────── */
function AddCustomSessionModal({ isOpen, onClose, student, defaultMonth, onSave }) {
  const { lang } = useLanguage();
  const [date, setDate] = useState(`${defaultMonth}-05`);
  const [time, setTime] = useState("10:00");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  return (
    <Modal
      title={lang === "ar" ? "تسجيل حصة تعويضية / خاصة للتلميذ" : "Ajouter une séance de rattrapage"}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, display: "block", marginBottom: 6 }}>
            {lang === "ar" ? "تاريخ الحصة:" : "Date de la séance :"}
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.ink, fontSize: 14, fontWeight: 700,
              outline: "none", colorScheme: "dark",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, display: "block", marginBottom: 6 }}>
            {lang === "ar" ? "الوقت:" : "Heure :"}
          </label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.ink, fontSize: 14,
              outline: "none", colorScheme: "dark",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, display: "block", marginBottom: 6 }}>
            {lang === "ar" ? "ملاحظة (مثال: تعويض غياب):" : "Remarque :"}
          </label>
          <input
            type="text"
            placeholder={lang === "ar" ? "حصة تعويضية خاصة" : "Rattrapage"}
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.ink, fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 10,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.inkSoft, fontWeight: 700, cursor: "pointer",
            }}
          >
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </button>
          <button
            type="button"
            onClick={() => onSave({ date, time, note })}
            style={{
              flex: 1.5, padding: "10px 16px", borderRadius: 10,
              border: "none", background: C.accent,
              color: "#fff", fontWeight: 800, cursor: "pointer",
            }}
          >
            {lang === "ar" ? "تسجيل الحصة" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── MAIN StudentScreen ───────────────────────────────────────── */
export default function StudentScreen({ studentId, data, setData, toastFn, onBack, onNav }) {
  const { lang } = useLanguage();
  const [showEdit, setShowEdit] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Month navigation: default to current month YYYY-MM
  const currentMonthInitial = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthInitial);

  const st = data.students?.find(s => s.id === studentId);
  if (!st) return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "التلميذ غير موجود" : "Élève introuvable"}</div>;

  const sg = [...(data.groups || [])].find(s => s.id === st.groupId);
  const cat = sg ? CAT_BY_ID[sg.categoryId] : null;

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(prev.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(next.toISOString().slice(0, 7));
  };

  /* ── SESSIONS & ATTENDANCES BY MONTH (المقررة والمحضورة حسب الشهر) ── */
  const monthData = useMemo(() => {
    // 1. All group sessions in this month
    const rawSessions = (data.sessions || [])
      .filter(s => s && (s.groupId === st.groupId || s.subgroupId === st.groupId) && String(s.date || "").startsWith(selectedMonth))
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

    // Ensure 4 baseline sessions per month, plus any extra sessions added
    let groupSessions = [...rawSessions];
    if (groupSessions.length === 0) {
      groupSessions = [1, 2, 3, 4].map(idx => ({
        id: `virtual-${selectedMonth}-${idx}`,
        groupId: st.groupId,
        date: `${selectedMonth}-${String(Math.min(28, Math.max(1, idx * 7 - 3))).padStart(2, "0")}`,
        time: "10:00",
        status: "planned",
      }));
    } else if (groupSessions.length < 4) {
      for (let idx = groupSessions.length + 1; idx <= 4; idx++) {
        groupSessions.push({
          id: `virtual-${selectedMonth}-${idx}`,
          groupId: st.groupId,
          date: `${selectedMonth}-${String(Math.min(28, Math.max(1, idx * 7 - 3))).padStart(2, "0")}`,
          time: "10:00",
          status: "planned",
        });
      }
    }

    // 2. Map group sessions with student's attendance records
    const list = groupSessions.map(sess => {
      const att = (data.attendances || []).find(
        a => a && a.studentId === st.id && (a.sessionId === sess.id || a.originalDate === sess.date || (!a.sessionId && a.date === sess.date))
      );

      const actualDate = att?.customDate || att?.date || sess.date;
      const isCustomDate = !!(att?.customDate && att.customDate !== sess.date);
      const isDone = sess.status === "done";
      const present = att ? !!att.present : false;
      const status = att ? (att.present ? "present" : "absent") : (isDone ? "absent" : "planned");

      return {
        session: sess,
        attendance: att || null,
        scheduledDate: sess.date,
        actualDate,
        time: sess.time || "10:00",
        isCustomDate,
        present,
        status,
        note: att?.note || sess.note || "",
        isProfAbsent: sess.status === "prof_absent",
      };
    });

    // 3. Standalone / custom attendances for this student in this month not already in group sessions
    const standaloneAtts = (data.attendances || []).filter(a => {
      if (a.studentId !== st.id) return false;
      const targetDate = a.customDate || a.date || "";
      if (!targetDate.startsWith(selectedMonth)) return false;
      return !groupSessions.some(s => s.id === a.sessionId || s.date === a.originalDate);
    });

    standaloneAtts.forEach(att => {
      list.push({
        session: { id: att.sessionId || uid(), date: att.date, time: "10:00", isExtra: true },
        attendance: att,
        scheduledDate: att.originalDate || att.date,
        actualDate: att.customDate || att.date,
        time: "10:00",
        isCustomDate: !!(att.customDate && att.customDate !== att.originalDate),
        present: !!att.present,
        status: att.present ? "present" : "absent",
        note: att.note || (lang === "ar" ? "حصة تعويضية / خاصة" : "Rattrapage"),
        isProfAbsent: false,
      });
    });

    list.sort((a, b) => a.actualDate.localeCompare(b.actualDate));

    const totalScheduled = list.length;
    const attendedCount = list.filter(s => s.status === "present").length;
    const absentCount = list.filter(s => s.status === "absent").length;
    const rate = totalScheduled > 0 ? Math.round((attendedCount / totalScheduled) * 100) : 0;

    return { list, totalScheduled, attendedCount, absentCount, rate };
  }, [data.sessions, data.attendances, st.id, st.groupId, selectedMonth, lang]);

  /* ── Save / Update Attendance Date ────────────────────────────── */
  const handleSaveAttendanceDate = ({ actualDate, present, note }) => {
    if (!editingAttendance) return;
    const sessionInfo = editingAttendance;

    setData(d => {
      let attendances = [...(d.attendances || [])];
      const sessionId = sessionInfo.session?.id;
      const scheduledDate = sessionInfo.scheduledDate;

      const existingIdx = attendances.findIndex(a =>
        a.studentId === st.id &&
        ((sessionId && a.sessionId === sessionId) || a.date === scheduledDate || a.originalDate === scheduledDate)
      );

      const isCustom = actualDate !== scheduledDate;

      if (existingIdx >= 0) {
        attendances[existingIdx] = {
          ...attendances[existingIdx],
          date: actualDate,
          customDate: isCustom ? actualDate : null,
          originalDate: scheduledDate,
          present,
          note: note || (isCustom ? `حضر يوم ${actualDate} بدل ${scheduledDate}` : ""),
        };
      } else {
        attendances.push({
          id: uid(),
          sessionId: sessionId || null,
          studentId: st.id,
          date: actualDate,
          customDate: isCustom ? actualDate : null,
          originalDate: scheduledDate,
          present,
          note: note || (isCustom ? `حضر يوم ${actualDate} بدل ${scheduledDate}` : ""),
        });
      }

      let notifs = d.userNotifications || [];
      if (!present) {
        notifs = notifyPresenceChange({ ...d, userNotifications: notifs }, st.id, actualDate, false);
      }

      return {
        ...d,
        attendances,
        userNotifications: notifs,
      };
    });

    setEditingAttendance(null);
    if (toastFn) {
      toastFn(
        actualDate !== sessionInfo.scheduledDate
          ? (lang === "ar"
            ? `🔄 تم تغيير تاريخ الحضور: حضر يوم ${actualDate} بدل ${sessionInfo.scheduledDate} ✓`
            : `🔄 Date ajustée : présent le ${actualDate} au lieu du ${sessionInfo.scheduledDate} ✓`)
          : (lang === "ar" ? "تم تحديث الحضور بنجاح ✓" : "Présence mise à jour ✓")
      );
    }
  };

  /* ── Quick Toggle Presence ────────────────────────────────────── */
  const handleQuickTogglePresence = (sessionInfo) => {
    setData(d => {
      let attendances = [...(d.attendances || [])];
      const sessionId = sessionInfo.session?.id;
      const scheduledDate = sessionInfo.scheduledDate;

      const existingIdx = attendances.findIndex(a =>
        a.studentId === st.id &&
        ((sessionId && a.sessionId === sessionId) || a.date === scheduledDate || a.originalDate === scheduledDate)
      );

      const newPresent = !sessionInfo.present;

      if (existingIdx >= 0) {
        attendances[existingIdx] = {
          ...attendances[existingIdx],
          present: newPresent,
        };
      } else {
        attendances.push({
          id: uid(),
          sessionId: sessionId || null,
          studentId: st.id,
          date: sessionInfo.actualDate || scheduledDate,
          originalDate: scheduledDate,
          present: newPresent,
        });
      }

      return {
        ...d,
        attendances,
      };
    });

    if (toastFn) {
      toastFn(
        !sessionInfo.present
          ? (lang === "ar" ? "✅ تم تسجيل الحضور" : "✅ Présent")
          : (lang === "ar" ? "❌ تم تسجيل الغياب" : "❌ Absent")
      );
    }
  };

  /* ── Add Custom Session ────────────────────────────────────────── */
  const handleAddCustomSession = ({ date, time, note }) => {
    setData(d => {
      const newAtt = {
        id: uid(),
        studentId: st.id,
        sessionId: null,
        date,
        customDate: date,
        originalDate: date,
        present: true,
        note: note || (lang === "ar" ? "حصة تعويضية خاصة" : "Rattrapage"),
      };
      return {
        ...d,
        attendances: [...(d.attendances || []), newAtt],
      };
    });
    setShowAddCustom(false);
    if (toastFn) {
      toastFn(lang === "ar" ? `تم تسجيل الحصة يوم ${date} ✓` : `Séance enregistrée le ${date} ✓`);
    }
  };

  /* ── Delete Extra / Custom Session ─────────────────────────────── */
  const handleDeleteExtraSession = (sessionInfo) => {
    const sDate = sessionInfo.actualDate || sessionInfo.scheduledDate;
    const confirmMsg = lang === "ar"
      ? `هل أنت متأكد من حذف هذه الحصة (${sDate})؟`
      : `Supprimer cette séance (${sDate}) ?`;
    if (!window.confirm(confirmMsg)) return;

    setData(d => ({
      ...d,
      sessions: (d.sessions || []).filter(s => s.id !== sessionInfo.session?.id),
      extraSessions: (d.extraSessions || []).filter(es => es.id !== sessionInfo.session?.id),
      attendances: (d.attendances || []).filter(a => {
        if (sessionInfo.session?.id && a.sessionId === sessionInfo.session.id) return false;
        if (sessionInfo.attendance?.id && a.id === sessionInfo.attendance.id) return false;
        return true;
      }),
    }));

    if (toastFn) {
      toastFn(lang === "ar" ? "تم حذف الحصة بنجاح ✓" : "Séance supprimée ✓");
    }
  };

  const payments = (data.payments || []).filter(p => p.studentId === st.id).sort((a, b) => (a.cycleNum || 0) - (b.cycleNum || 0));
  const studentPrice = st.monthlyPrice || st.montant || 0;

  const saveStudent = (student) => {
    setData(d => {
      const notifs = notifyAccountUpdated(d, student.id, lang === "ar" ? "تم تعديل وتحديث بيانات حسابك من قبل الإدارة." : "Votre profil a été mis à jour par l'administration.", lang);
      const existingEnrollment = (d.enrollments || []).find(e => e.studentId === student.id && e.academicYearId === d.activeYearId);
      const enrollmentObj = {
        id: existingEnrollment ? existingEnrollment.id : uid(),
        studentId: student.id,
        academicYearId: d.activeYearId,
        groupId: student.groupId || null,
        monthlyPrice: Number(student.monthlyPrice) || 0
      };
      const newEnrollments = existingEnrollment
        ? (d.enrollments || []).map(e => e.id === existingEnrollment.id ? enrollmentObj : e)
        : [...(d.enrollments || []), enrollmentObj];

      return {
        ...d,
        students: d.students.map(s => s.id === student.id ? student : s),
        enrollments: newEnrollments,
        userNotifications: notifs,
      };
    });
    setShowEdit(false);
    if (toastFn) toastFn(lang === "ar" ? "تم تعديل التلميذ وإشعاره ✓" : "Élève modifié & notifié ✓");
  };

  const togglePaid = (pId) => {
    const targetPmt = payments.find(p => p.id === pId);
    const isNowPaid = targetPmt ? !targetPmt.paid : true;

    setData(d => {
      let notifs = d.userNotifications || [];
      if (isNowPaid && targetPmt) {
        notifs = notifyPaymentReceived(d, st.id, targetPmt.amount || studentPrice, {
          type: "course",
          groupId: st.groupId,
          cycleNum: targetPmt.cycleNum
        }, lang);
      }
      return {
        ...d,
        payments: d.payments.map(p => p.id === pId ? {
          ...p,
          paid: isNowPaid,
          paidDate: isNowPaid ? new Date().toISOString().slice(0, 10) : null
        } : p),
        userNotifications: notifs,
      };
    });

    if (toastFn) {
      toastFn(isNowPaid
        ? (lang === "ar" ? "تم تأكيد الدفع وإشعار التلميذ ✓" : "Paiement validé & élève notifié ✓")
        : (lang === "ar" ? "تم إلغاء حالة الدفع" : "Paiement annulé")
      );
    }
  };

  const resetPassword = () => {
    const newPw = uid().slice(0, 6);
    setData(d => {
      const notifs = notifyAccountUpdated(d, st.id, lang === "ar" ? "تم إعادة تعيين كلمة المرور الخاصة بك. كلمة المرور الجديدة: " + newPw : "Votre mot de passe a été réinitialisé. Nouveau: " + newPw, lang);
      return {
        ...d,
        students: d.students.map(s => s.id === st.id ? { ...s, password: newPw, lastModified: new Date().toISOString() } : s),
        userNotifications: notifs,
      };
    });
    if (toastFn) toastFn(lang === "ar" ? `كلمة مرور جديدة: ${newPw} ✓` : `Nouveau mot de passe: ${newPw} ✓`);
  };

  const toggleAccountStatus = () => {
    const newStatus = st.accountStatus === "active" ? "inactive" : "active";
    setData(d => {
      const msg = newStatus === "active"
        ? (lang === "ar" ? "تم تفعيل حسابك من قبل الإدارة." : "Votre compte a été activé par l'administration.")
        : (lang === "ar" ? "تم تعطيل حسابك من قبل الإدارة." : "Votre compte a été désactivé par l'administration.");
      const notifs = notifyAccountUpdated(d, st.id, msg, lang);
      return {
        ...d,
        students: d.students.map(s => s.id === st.id ? { ...s, accountStatus: newStatus, lastModified: new Date().toISOString() } : s),
        userNotifications: notifs,
      };
    });
    if (toastFn) toastFn(newStatus === "active"
      ? (lang === "ar" ? "تم تفعيل الحساب ✓" : "Compte activé ✓")
      : (lang === "ar" ? "تم تعطيل الحساب ✗" : "Compte désactivé ✗")
    );
  };

  const [selYear, selMonthNum] = selectedMonth.split("-").map(Number);
  const monthDateObj = new Date(selYear, selMonthNum - 1, 1);
  const formattedMonthLabel = monthDateObj.toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      <button onClick={onBack} style={{ border: "none", background: "none", color: C.inkSoft, display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: 0 }}>
        <ArrowLeft size={15} /> {lang === "ar" ? "رجوع" : "Retour"}
      </button>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: st.enrollmentPaid ? C.accentSoft : "rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24, color: st.enrollmentPaid ? C.accent : "#fbbf24", flexShrink: 0 }}>
            {st.prenom?.[0]}{st.nom?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <h2 className="f-display" style={{ fontSize: 28, fontWeight: 700, color: C.ink, margin: 0 }}>
              {st.prenom} {st.nom}
            </h2>
            <div className="f-mono" style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {st.studentCode && <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 800 }}>{st.studentCode}</span>}
              {st.phone || (lang === "ar" ? "لا يوجد هاتف" : "Aucun téléphone")}
              {st.school && <span>· {st.school}</span>}
              {st.studyClass && <span>· {st.studyClass}</span>}
            </div>
            {sg && (
              <div style={{
                marginTop: 10, padding: "8px 14px", borderRadius: 10,
                background: cat ? `${cat.color}15` : "rgba(255,255,255,0.05)",
                border: `1px solid ${cat ? `${cat.color}40` : C.border}`,
                display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 8,
                fontSize: 13.5, fontWeight: 700, color: cat ? cat.color : C.ink
              }}>
                {cat && <cat.icon size={15} />}
                {cat ? cat.label : (lang === "ar" ? "مجموعة" : "Groupe")}
                <span style={{ color: C.inkSoft }}>›</span>
                {sg.levelId || (lang === "ar" ? "بدون مستوى" : "Sans niveau")}
                <span style={{ color: C.inkSoft }}>›</span>
                <span style={{ background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 6, color: C.ink }}>{sg.groupType || "Groupe Normal"}</span>
                <span style={{ color: C.inkSoft }}>›</span>
                <span style={{ color: C.ink }}>{sg.nom}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

      {/* ── Table de Profil Structuré ──────────────────────────── */}
      {(() => {
        const fin = getStudentFinancialSummary(data, st.id, data.activeYearId);
        return (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 24, boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13.5 }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px", color: C.inkSoft, fontWeight: 700, width: "30%", background: "rgba(255,255,255,0.02)" }}>{lang === "ar" ? "رقم التلميذ (Numéro)" : "Numéro Élève"}</td>
                  <td style={{ padding: "14px 20px", color: C.ink, fontWeight: 800 }}>{st.studentCode || (lang === "ar" ? "غير محدد" : "Non défini")}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px", color: C.inkSoft, fontWeight: 700, background: "rgba(255,255,255,0.02)" }}>{lang === "ar" ? "الاسم واللقب" : "Nom & Prénom"}</td>
                  <td style={{ padding: "14px 20px", color: C.ink, fontWeight: 800 }}>{st.prenom} {st.nom}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px", color: C.inkSoft, fontWeight: 700, background: "rgba(255,255,255,0.02)" }}>{lang === "ar" ? "كلمة المرور (Password)" : "Mot de passe"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: C.ink, fontWeight: 700, letterSpacing: 2 }}>••••••••</span>
                      <button
                        onClick={resetPassword}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.07)", color: C.inkSoft, cursor: "pointer", transition: "all 0.15s" }}
                      >
                        <Key size={12} /> {lang === "ar" ? "إعادة التعيين" : "Réinitialiser"}
                      </button>
                    </div>
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px", color: C.inkSoft, fontWeight: 700, background: "rgba(255,255,255,0.02)" }}>{lang === "ar" ? "رسوم التسجيل (500 DA)" : "Inscription (500 DA)"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.enrollmentPaid ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", color: st.enrollmentPaid ? "#4ade80" : "#f87171" }}>
                      {st.enrollmentPaid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {st.enrollmentPaid ? (lang === "ar" ? "مسدد ✓" : "Payé ✓") : (lang === "ar" ? "غير مسدد (500 DA) ⚠" : "Impayé (500 DA) ⚠")}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px", color: C.inkSoft, fontWeight: 700, background: "rgba(255,255,255,0.02)" }}>{lang === "ar" ? "رسوم الدراسة والمدفوعات" : "Paiements"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div>
                        <span style={{ color: C.inkSoft, fontSize: 12, marginRight: 6 }}>{lang === "ar" ? "السعر المتفق عليه:" : "Tarif:"}</span>
                        <span style={{ color: C.accent, fontWeight: 800 }}>{(st.monthlyPrice || sg?.price || 0).toLocaleString()} DA</span>
                      </div>
                      <div>
                        <span style={{ color: C.inkSoft, fontSize: 12, marginRight: 6 }}>{lang === "ar" ? "إجمالي المسدد:" : "Total Payé:"}</span>
                        <span style={{ color: "#4ade80", fontWeight: 800 }}>{fin.totalPaid.toLocaleString()} DA</span>
                      </div>
                      {fin.totalUnpaid > 0 && (
                        <div>
                          <span style={{ color: C.inkSoft, fontSize: 12, marginRight: 6 }}>{lang === "ar" ? "المتبقي:" : "Reste:"}</span>
                          <span style={{ color: "#f87171", fontWeight: 800 }}>{fin.totalUnpaid.toLocaleString()} DA</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px", color: C.inkSoft, fontWeight: 700, background: "rgba(255,255,255,0.02)" }}>{lang === "ar" ? "بطاقة NFC" : "Carte NFC"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.nfcCardId ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)", color: st.nfcCardId ? "#4ade80" : C.inkSoft }}>
                        <Radio size={14} />
                        {st.nfcCardId ? (lang === "ar" ? "متصل ✓" : "Connectée ✓") : (lang === "ar" ? "غير متصل" : "Non connectée")}
                      </span>
                      {!st.nfcCardId && (
                        <button
                          onClick={() => setShowEdit(true)}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, border: `1px solid rgba(226,150,58,0.4)`, background: "rgba(226,150,58,0.15)", color: C.accent, cursor: "pointer", transition: "all 0.15s" }}
                        >
                          <Radio size={12} /> {lang === "ar" ? "إضافة بطاقة" : "Ajouter une carte"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "14px 20px", color: C.inkSoft, fontWeight: 700, background: "rgba(255,255,255,0.02)" }}>{lang === "ar" ? "حالة الحساب" : "Statut du compte"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontWeight: 800, color: st.accountStatus === "active" ? "#4ade80" : "#f87171" }}>
                        {st.accountStatus === "active" ? (lang === "ar" ? "نشط ✓" : "Actif ✓") : (lang === "ar" ? "معطل ✗" : "Inactif ✗")}
                      </span>
                      <button
                        onClick={toggleAccountStatus}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, border: `1px solid ${st.accountStatus === "active" ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`, background: st.accountStatus === "active" ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)", color: st.accountStatus === "active" ? "#f87171" : "#4ade80", cursor: "pointer" }}
                      >
                        <Shield size={12} /> {st.accountStatus === "active" ? (lang === "ar" ? "تعطيل" : "Désactiver") : (lang === "ar" ? "تفعيل" : "Activer")}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── SECTION DÉTAILLÉE: رزنامة الحصص الشهرية وتعديل التاريخ ───────── */}
      <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 22, marginBottom: 24, boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
        {/* Month Selector & Action Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarDays size={20} color="#3b82f6" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.ink }}>
                {lang === "ar" ? "📅 رزنامة الحصص وسجل الحضور (شهرياً)" : "Calendrier des séances & Présences par mois"}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.inkSoft }}>
                {lang === "ar" ? "متابعة الحصص المقررة، الحضور والغياب، مع إمكانية تعديل التاريخ للأستاذ (مثال: حضر يوم 5 بدل 2)" : "Suivi des dates prévues et réelles avec modification de date par élève"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Month Navigator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "4px 8px" }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, minWidth: 120, textAlign: "center" }}>
                {formattedMonthLabel}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
              >
                <ChevronRight size={18} />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ background: "transparent", border: "none", color: C.inkSoft, fontSize: 12, outline: "none", cursor: "pointer", colorScheme: "dark", width: 22 }}
              />
            </div>

            {/* Add custom session button */}
            <button
              onClick={() => setShowAddCustom(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10,
                background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)",
                color: C.accent, fontWeight: 700, fontSize: 12.5, cursor: "pointer"
              }}
            >
              <Plus size={14} />
              {lang === "ar" ? "+ حصة تعويضية خاصة" : "+ Rattrapage"}
            </button>
          </div>
        </div>

        {/* Monthly Summary Badges */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600 }}>{lang === "ar" ? "الحصص المقررة" : "Séances prévues"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginTop: 2 }}>{monthData.totalScheduled}</div>
          </div>
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>{lang === "ar" ? "حضر فيها" : "Présent"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80", marginTop: 2 }}>{monthData.attendedCount}</div>
          </div>
          <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700 }}>{lang === "ar" ? "غيابات" : "Absences"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f87171", marginTop: 2 }}>{monthData.absentCount}</div>
          </div>
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>{lang === "ar" ? "نسبة الحضور" : "Taux du mois"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: monthData.rate >= 75 ? "#4ade80" : "#fbbf24", marginTop: 2 }}>{monthData.rate}%</div>
          </div>
        </div>

        {/* Sessions Detailed List */}
        <div style={{ display: "grid", gap: 10 }}>
          {monthData.list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 16px", background: "rgba(255,255,255,0.02)", border: `1px dashed ${C.border}`, borderRadius: 14 }}>
              <Clock size={28} color={C.inkSoft} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                {lang === "ar" ? `لا توجد حصص مبرمجة في شهر ${formattedMonthLabel}` : `Aucune séance prévue pour ${formattedMonthLabel}`}
              </div>
              <p style={{ fontSize: 12, color: C.inkSoft, margin: "4px 0 12px" }}>
                {lang === "ar" ? "يمكنك إضافة حصة تعويضية أو التحقق من رزنامة الفوج" : "Vous pouvez ajouter une séance de rattrapage"}
              </p>
              <button
                onClick={() => setShowAddCustom(true)}
                style={{
                  background: C.accent, border: "none", borderRadius: 8, padding: "7px 16px",
                  color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer"
                }}
              >
                + {lang === "ar" ? "إضافة حصة للتلميذ" : "Ajouter une séance"}
              </button>
            </div>
          ) : (
            monthData.list.map((item, index) => {
              const isCustom = item.isCustomDate;
              const dateObj = new Date((item.actualDate || item.scheduledDate) + "T12:00");
              const formattedDate = dateObj.toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
              const originalDateObj = item.scheduledDate ? new Date(item.scheduledDate + "T12:00") : null;
              const formattedOriginal = originalDateObj ? originalDateObj.toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short" }) : "";

              return (
                <div
                  key={item.session?.id || index}
                  style={{
                    background: isCustom ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.02)",
                    border: `1.5px solid ${isCustom ? "rgba(59,130,246,0.35)" : C.border}`,
                    borderRadius: 14,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Left: Session Number & Dates */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: item.present ? "rgba(74,222,128,0.15)" : item.status === "absent" ? "rgba(248,113,113,0.15)" : "rgba(99,102,241,0.15)",
                      border: `1px solid ${item.present ? "rgba(74,222,128,0.35)" : item.status === "absent" ? "rgba(248,113,113,0.35)" : "rgba(99,102,241,0.35)"}`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: item.present ? "#4ade80" : item.status === "absent" ? "#f87171" : "#818cf8" }}>
                        #{index + 1}
                      </span>
                      <span style={{ fontSize: 9.5, color: C.inkSoft }}>{item.time}</span>
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: C.ink }}>
                          {formattedDate}
                        </span>

                        {/* Special badge if date was modified (e.g. حضر يوم 5 بدل 2) */}
                        {isCustom && (
                          <span style={{
                            background: "rgba(59,130,246,0.2)",
                            border: "1px solid #3b82f6",
                            color: "#60a5fa",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}>
                            <RotateCcw size={11} />
                            {lang === "ar" ? `حضر يوم ${item.actualDate?.slice(8)} بدل ${item.scheduledDate?.slice(8)}` : `Modifié: le ${item.actualDate?.slice(8)} au lieu du ${item.scheduledDate?.slice(8)}`}
                          </span>
                        )}

                        {item.session?.isExtra && (
                          <span style={{ background: "rgba(226,150,58,0.2)", color: C.accent, borderRadius: 6, fontSize: 10.5, fontWeight: 800, padding: "2px 6px" }}>
                            {lang === "ar" ? "تعويضية" : "Rattrapage"}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 3 }}>
                        {lang === "ar" ? "التاريخ المبرمج:" : "Date prévue :"} {item.scheduledDate} · {item.time}
                        {item.note && <span style={{ marginLeft: 8, color: C.accent }}>• {item.note}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge & Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Quick Toggle Presence Button */}
                    <button
                      type="button"
                      onClick={() => handleQuickTogglePresence(item)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8,
                        background: item.present ? "rgba(74,222,128,0.18)" : item.status === "absent" ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${item.present ? "rgba(74,222,128,0.4)" : item.status === "absent" ? "rgba(248,113,113,0.4)" : C.border}`,
                        color: item.present ? "#4ade80" : item.status === "absent" ? "#f87171" : C.inkSoft,
                        fontWeight: 800, fontSize: 12.5, cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title={lang === "ar" ? "انقر لتغيير حالة الحضور" : "Cliquer pour changer"}
                    >
                      {item.present ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                      {item.present ? (lang === "ar" ? "حاضر ✓" : "Présent ✓") : (lang === "ar" ? "غائب ✗" : "Absent ✗")}
                    </button>

                    {/* Button to edit date (t9dr l prof tbdl la date) */}
                    <button
                      type="button"
                      onClick={() => setEditingAttendance(item)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8,
                        background: isCustom ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isCustom ? "#3b82f6" : C.border}`,
                        color: isCustom ? "#60a5fa" : C.ink,
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                      title={lang === "ar" ? "تعديل تاريخ الحضور (مثلاً حضر يوم 5 بدل 2)" : "Modifier la date (ex: présent le 5 au lieu du 2)"}
                    >
                      <Edit2 size={12} />
                      {lang === "ar" ? "تغيير التاريخ" : "Changer date"}
                    </button>

                    {/* Delete button if extra or custom session */}
                    {(item.session?.isExtra || item.attendance?.note?.includes("تعويضية") || item.attendance?.note?.includes("خاصة")) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteExtraSession(item)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 10px", borderRadius: 8,
                          background: "rgba(248,113,113,0.14)", border: "1px solid rgba(248,113,113,0.35)",
                          color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                        title={lang === "ar" ? "حذف هذه الحصة" : "Supprimer"}
                      >
                        <Trash2 size={12} />
                        {lang === "ar" ? "حذف" : "Supprimer"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Payments Column ───────────────────────────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, marginBottom: 24 }}>
        <h3 className="f-display" style={{ margin: "0 0 14px", fontSize: 18, color: C.ink, fontWeight: 700 }}>
          {lang === "ar" ? "سجل المدفوعات" : "Historique des paiements"}
        </h3>
        <div style={{ display: "grid", gap: 10 }}>
          {payments.length === 0 ? (
            <div style={{ textAlign: "center", color: C.inkSoft, padding: "20px 0", fontSize: 13, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 14 }}>
              {lang === "ar" ? "لا توجد دفعات مسجلة" : "Aucun paiement enregistré"}
            </div>
          ) : (
            payments.map(p => (
              <div key={p.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{lang === "ar" ? "دفعة" : "Paiement"} #{p.cycleNum || 1}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{p.amount || studentPrice} DA</div>
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

      {/* Edit Student Modal */}
      {showEdit && (
        <StudentFormModal
          groupId={st.groupId}
          initial={st}
          enrollmentFee={data.settings?.enrollmentFee || 500}
          allStudents={data.students}
          allSubgroups={[...(data.groups || [])]}
          onClose={() => setShowEdit(false)}
          onSave={saveStudent}
        />
      )}

      {/* Edit Attendance Date Modal */}
      {editingAttendance && (
        <EditAttendanceDateModal
          isOpen={!!editingAttendance}
          onClose={() => setEditingAttendance(null)}
          student={st}
          sessionInfo={editingAttendance}
          onSave={handleSaveAttendanceDate}
        />
      )}

      {/* Add Custom Session Modal */}
      {showAddCustom && (
        <AddCustomSessionModal
          isOpen={showAddCustom}
          onClose={() => setShowAddCustom(false)}
          student={st}
          defaultMonth={selectedMonth}
          onSave={handleAddCustomSession}
        />
      )}
    </div>
  );
}
