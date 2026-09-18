import React, { useState, useMemo } from "react";
import {
  Users, User, KeyRound, Eye, EyeOff, Copy, Check, MessageCircle,
  Bell, Pencil, Trash2, Search, Plus, Filter, ShieldCheck, AlertCircle,
  CheckCircle2, X, RefreshCw, Send, Share2, GraduationCap, ChevronDown, ArrowLeft, ArrowRight
} from "lucide-react";
import { C, uid, inputStyle, CAT_BY_ID, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import Pill from "../../components/ui/Pill";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import { notifyPaymentReceived, notifyAccountUpdated } from "../../utils/notificationEngine";
import StudentFormModal from "./StudentFormModal";

/* ── Modal: Modifier le mot de passe ── */
function PasswordModal({ student, onClose, onSave }) {
  const { lang } = useLanguage();
  const [newPass, setNewPass] = useState(student.password || "");
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [copied, setCopied] = useState(false);

  const generatePass = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 6; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(p);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newPass);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      title={lang === "ar" ? `تغيير كلمة مرور: ${student.prenom} ${student.nom}` : `Modifier le mot de passe : ${student.prenom} ${student.nom}`}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 16 }}>
        {/* Info box */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", fontWeight: 700 }}>
              {lang === "ar" ? "معرّف الدخول (رقم الهاتف)" : "Identifiant (Téléphone)"}
            </div>
            <div className="f-mono" style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginTop: 2 }}>
              {student.phone || "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, background: C.accentSoft, color: C.accent, padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
              {lang === "ar" ? "حساب طالب" : "Compte élève"}
            </span>
          </div>
        </div>

        {/* Password input & generator */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
            {lang === "ar" ? "كلمة المرور الجديدة" : "Nouveau mot de passe"}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Ex: ab78x9"
              className="f-mono"
              style={{ ...inputStyle, flex: 1, letterSpacing: 2, fontSize: 15, fontWeight: 700 }}
            />
            <button
              type="button"
              onClick={generatePass}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 14px", borderRadius: 10,
                background: "rgba(226,150,58,0.18)", border: "1px solid rgba(226,150,58,0.4)",
                color: C.accent, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              title={lang === "ar" ? "توليد كلمة مرور عشوائية" : "Générer un mot de passe"}
            >
              <RefreshCw size={14} />
              {lang === "ar" ? "توليد" : "Générer"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!newPass}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`,
                color: copied ? "#4ade80" : C.ink, cursor: "pointer"
              }}
              title={lang === "ar" ? "نسخ" : "Copier"}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Notify student checkbox */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.ink }}>
          <input
            type="checkbox"
            checked={notifyStudent}
            onChange={e => setNotifyStudent(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: C.accent }}
          />
          {lang === "ar"
            ? "إرسال إشعار مباشر في حساب التلميذ بكلمة المرور الجديدة"
            : "Notifier l'élève de son nouveau mot de passe"}
        </label>

        <div style={{ marginTop: 8 }}>
          <PrimaryBtn
            full
            onClick={() => onSave(student.id, newPass.trim(), notifyStudent)}
            disabled={!newPass.trim()}
          >
            <KeyRound size={16} />
            {lang === "ar" ? "حفظ كلمة المرور" : "Enregistrer le mot de passe"}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ── Modal: Envoyer une notification directe ── */
function SendNotificationModal({ student, onClose, onSend }) {
  const { lang } = useLanguage();
  const [title, setTitle] = useState(lang === "ar" ? "إشعار إداري" : "Notification de l'administration");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(student.id, title.trim(), message.trim());
    onClose();
  };

  return (
    <Modal
      title={lang === "ar" ? `إرسال إشعار إلى : ${student.prenom} ${student.nom}` : `Envoyer une notification : ${student.prenom} ${student.nom}`}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Field label={lang === "ar" ? "عنوان الإشعار" : "Titre de la notification"}>
          <input
            style={inputStyle}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>
        <Field label={lang === "ar" ? "نص الرسالة" : "Message"}>
          <textarea
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={lang === "ar" ? "اكتب الإشعار هنا..." : "Écrivez le message de notification..."}
          />
        </Field>
        <PrimaryBtn full onClick={handleSend} disabled={!message.trim()}>
          <Send size={15} />
          {lang === "ar" ? "إرسال الإشعار فوراً" : "Envoyer la notification"}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}


/* ═════════════════════════════════════════════════════════════════
   MAIN COMPONENT: Student Accounts Dashboard
══════════════════════════════════════════════════════════════════ */
export default function ParentsScreen({ data, setData, toastFn, openChat, onBack, activeYearId }) {
  const { lang, isRTL } = useLanguage();

  const [search, setSearch] = useState("");
  const [filterCycle, setFilterCycle] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'has_pass' | 'no_pass' | 'paid' | 'unpaid'

  // Modals state
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [notifTarget, setNotifTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Visible passwords tracker: { [studentId]: boolean }
  const [revealedPasswords, setRevealedPasswords] = useState({});

  const toggleRevealPassword = (id) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const students = data.students || [];
  const groups = data.groups || [];

  const groupMap = useMemo(() => {
    const map = {};
    groups.forEach(sg => { map[sg.id] = sg; });
    return map;
  }, [groups]);

  // ── Dashboard Metrics ──
  const stats = useMemo(() => {
    const total = students.length;
    const withPassword = students.filter(s => s.password && s.password.trim().length > 0).length;
    const enrollmentPaid = students.filter(s => s.enrollmentPaid).length;
    const activeGroups = new Set(students.map(s => s.groupId).filter(Boolean)).size;

    return { total, withPassword, enrollmentPaid, activeGroups };
  }, [students]);

  // ── Filtered Students ──
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Find active enrollment
      const en = (data.enrollments || []).find(e => e.studentId === s.id && e.academicYearId === activeYearId);
      const sGroupId = en ? en.groupId : null;
      const sGroup = sGroupId ? groupMap[sGroupId] : null;

      // Group/Hierarchy filter
      if (filterCycle !== "all" && sGroup?.categoryId !== filterCycle) return false;
      if (filterLevel !== "all" && sGroup?.levelId !== filterLevel) return false;
      if (selectedGroupFilter !== "all" && sGroupId !== selectedGroupFilter) return false;

      // Status filter
      if (statusFilter === "has_pass" && (!s.password || !s.password.trim())) return false;
      if (statusFilter === "no_pass" && s.password && s.password.trim()) return false;
      if (statusFilter === "paid" && !s.enrollmentPaid) return false;
      if (statusFilter === "unpaid" && s.enrollmentPaid) return false;
      if (statusFilter === "debt") {
        const fin = getStudentFinancialSummary(data, s.id, activeYearId);
        if (fin.totalUnpaid === 0) return false;
      }
      if (statusFilter === "settled") {
        const fin = getStudentFinancialSummary(data, s.id, activeYearId);
        if (fin.totalUnpaid > 0) return false;
      }

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const fullName = `${s.prenom || ""} ${s.nom || ""}`.toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const sgName = sGroup ? sGroup.nom.toLowerCase() : "";

        return fullName.includes(q) || phone.includes(q) || sgName.includes(q);
      }

      return true;
    });
  }, [students, filterCycle, filterLevel, selectedGroupFilter, statusFilter, search, groupMap, data.enrollments, activeYearId]);

  const sgOptions = groups.filter(sg => {
    if (sg.academicYearId && sg.academicYearId !== activeYearId) return false;
    if (filterCycle !== "all" && sg.categoryId !== filterCycle) return false;
    if (filterLevel !== "all" && sg.levelId !== filterLevel) return false;
    return true;
  });
  
  const levelOptions = [...new Set(groups.filter(sg => {
    if (sg.academicYearId && sg.academicYearId !== activeYearId) return false;
    if (filterCycle !== "all" && sg.categoryId !== filterCycle) return false;
    return true;
  }).map(g => g.levelId))].filter(Boolean);
  
  const cycleOptions = [...new Set(groups.filter(sg => {
    if (sg.academicYearId && sg.academicYearId !== activeYearId) return false;
    return true;
  }).map(g => g.categoryId))].filter(Boolean);

  // ── Handlers ──
  const handleSavePassword = (studentId, newPassword, sendNotif) => {
    setData(d => {
      const updatedStudents = (d.students || []).map(s => {
        if (s.id === studentId) {
          return { ...s, password: newPassword };
        }
        return s;
      });

      let updatedNotifs = d.userNotifications || [];
      if (sendNotif) {
        const notif = {
          id: uid(),
          userId: studentId,
          type: "info",
          title: lang === "ar" ? "تحديث كلمة المرور 🔐" : "Mot de passe mis à jour 🔐",
          message: lang === "ar"
            ? `تم تحديث كلمة المرور لحسابك بنجاح. كلمة مرورك الجديدة هي: ${newPassword}`
            : `Votre mot de passe a été mis à jour avec succès : ${newPassword}`,
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          read: false,
        };
        updatedNotifs = [...updatedNotifs, notif];
      }

      return {
        ...d,
        students: updatedStudents,
        userNotifications: updatedNotifs,
      };
    });

    setPasswordTarget(null);
    toastFn(lang === "ar" ? "تم تحديث كلمة المرور بنجاح ✓" : "Mot de passe mis à jour ✓");
  };

  const handleSendDirectNotif = (studentId, title, message) => {
    const notif = {
      id: uid(),
      userId: studentId,
      type: "info",
      title,
      message,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };

    setData(d => ({
      ...d,
      userNotifications: [...(d.userNotifications || []), notif],
    }));

    toastFn(lang === "ar" ? "تم إرسال الإشعار إلى حساب التلميذ ✓" : "Notification envoyée à l'élève ✓");
  };

  const handleSaveStudentAccount = (studentData) => {
    const isEdit = !!(editTarget);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    setData(d => {
      const exists = (d.students || []).some(s => s.id === studentData.id);
      let updatedStudents;
      const enrichedData = { ...studentData, lastModified: now.toISOString() };
      if (!exists) {
        enrichedData.createdAt = now.toISOString();
      }

      if (exists) {
        updatedStudents = d.students.map(s => s.id === studentData.id ? { ...s, ...enrichedData } : s);
      } else {
        updatedStudents = [...(d.students || []), enrichedData];
      }

      // Send notification to the student when their account is modified
      let updatedNotifs = d.userNotifications || [];
      if (isEdit) {
        const notif = {
          id: uid(),
          userId: studentData.id,
          type: "info",
          title: lang === "ar" ? "تحديث بيانات حسابك 📝" : "Mise à jour de votre compte 📝",
          message: lang === "ar"
            ? `تم تعديل بيانات حسابك من قبل الإدارة بتاريخ ${dateStr} الساعة ${timeStr}.`
            : `Les informations de votre compte ont été modifiées par l'administration le ${dateStr} à ${timeStr}.`,
          date: dateStr,
          time: timeStr,
          read: false,
        };
        updatedNotifs = [...updatedNotifs, notif];
      }

      return { ...d, students: updatedStudents, userNotifications: updatedNotifs };
    });

    setEditTarget(null);
    toastFn(
      isEdit
        ? (lang === "ar" ? "تم تعديل حساب التلميذ ✓" : "Compte modifié ✓")
        : (lang === "ar" ? "تم إنشاء حساب التلميذ بنجاح ✓" : "Compte créé ✓")
    );
  };

  const handleDeleteStudent = (student) => {
    const msg = lang === "ar"
      ? `هل أنت متأكد من حذف حساب التلميذ "${student.prenom} ${student.nom}"؟`
      : `Supprimer le compte de l'élève "${student.prenom} ${student.nom}" ?`;

    if (window.confirm(msg)) {
      setData(d => ({
        ...d,
        students: (d.students || []).filter(s => s.id !== student.id),
        payments: (d.payments || []).filter(p => p.studentId !== student.id),
        attendances: (d.attendances || []).filter(a => a.studentId !== student.id),
        userNotifications: (d.userNotifications || []).filter(n => n.userId !== student.id),
      }));
      toastFn(lang === "ar" ? "تم حذف حساب التلميذ" : "Compte supprimé");
    }
  };

  const handleCopyCredentials = (student) => {
    const textToCopy = lang === "ar"
      ? `مرحباً ${student.prenom}، إليك بيانات حسابك في منصة المدرسة:\n• اسم المستخدم / رقم الهاتف: ${student.phone || "—"}\n• كلمة المرور: ${student.password || "—"}`
      : `Bonjour ${student.prenom}, voici vos accès pour l'espace élève :\n• Identifiant / Téléphone : ${student.phone || "—"}\n• Mot de passe : ${student.password || "—"}`;

    navigator.clipboard.writeText(textToCopy);
    toastFn(lang === "ar" ? "تم نسخ معلومات الدخول للمشاركة ✓" : "Identifiants copiés dans le presse-papier ✓");
  };

  const toggleEnrollmentStatus = (student) => {
    const isNowPaid = !student.enrollmentPaid;
    const feeAmount = data.settings?.enrollmentFee || 500;
    const todayStr = new Date().toISOString().slice(0, 10);
    setData(d => {
      let nextNotifications = d.userNotifications || [];
      if (isNowPaid) {
        nextNotifications = notifyPaymentReceived(d, student.id, feeAmount, { type: "enrollment" }, lang);
      }
      return {
        ...d,
        students: (d.students || []).map(s => s.id === student.id ? { ...s, enrollmentPaid: isNowPaid, enrollmentDate: isNowPaid ? todayStr : s.enrollmentDate } : s),
        userNotifications: nextNotifications,
      };
    });
    toastFn(
      isNowPaid
        ? (lang === "ar" ? "تم تسديد حقوق التسجيل وإشعار التلميذ ✓" : "Frais réglés & notification envoyée ✓")
        : (lang === "ar" ? "تم تحديد حقوق التسجيل كغير مدفوعة" : "Frais d'inscription marqués non payés")
    );
  };

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`,
                color: C.ink, fontSize: 13, fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            >
              {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              {lang === "ar" ? "رجوع" : "Retour"}
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(226,150,58,0.18)", border: "1px solid rgba(226,150,58,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={22} color={C.accent} />
            </div>
            <div>
              <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>
                {lang === "ar" ? "لوحة إدارة حسابات الطلاب" : "Gestion des Comptes Étudiants"}
              </h2>
              <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
                {lang === "ar"
                  ? "متابعة حسابات الدخول، إدارة كلمات المرور، وتوزيع بيانات الحساب للتلاميذ"
                  : "Tableau de bord des accès, gestion des mots de passe et transmission des identifiants"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onBack && <IconBtn icon={X} onClick={onBack} title={lang === "ar" ? "إغلاق" : "Fermer"} />}
        </div>
      </div>

      {/* ── KPI Dashboard Cards ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 22 }}>
        {/* Total students */}
        <div
          onClick={() => { setSearch(""); setSelectedGroupFilter("all"); setStatusFilter("all"); }}
          style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
            cursor: "pointer", transition: "all 0.15s"
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#818cf8"}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          title={lang === "ar" ? "عرض جميع حسابات التلاميذ" : "Afficher tous les élèves"}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={20} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase" }}>
              {lang === "ar" ? "إجمالي التلاميذ (عرض الكل)" : "Total élèves (tous)"}
            </div>
            <div className="f-display" style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 2 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Operational / with password */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color="#4ade80" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase" }}>
              {lang === "ar" ? "حسابات بكلمة مرور جاهزة" : "Mots de passe prêts"}
            </div>
            <div className="f-display" style={{ fontSize: 22, fontWeight: 800, color: "#4ade80", marginTop: 2 }}>
              {stats.withPassword} <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 500 }}>/ {stats.total}</span>
            </div>
          </div>
        </div>

        {/* Inscription fees */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={20} color={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase" }}>
              {lang === "ar" ? "حقوق التسجيل المسواة" : "Inscriptions payées"}
            </div>
            <div className="f-display" style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 2 }}>
              {stats.enrollmentPaid} <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 500 }}>({stats.total > 0 ? Math.round((stats.enrollmentPaid / stats.total) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Active groups */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={20} color="#f472b6" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase" }}>
              {lang === "ar" ? "الأفواج المغطاة" : "Groupes couverts"}
            </div>
            <div className="f-display" style={{ fontSize: 22, fontWeight: 800, color: "#f472b6", marginTop: 2 }}>
              {stats.activeGroups}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ────────────────────────── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18
      }}>
        {/* Search input */}
        <div style={{ position: "relative", flex: 1, minWidth: "min(240px, 100%)", maxWidth: 380 }}>
          <Search size={15} color={C.inkSoft} style={{ position: "absolute", left: isRTL ? "auto" : 12, right: isRTL ? 12 : "auto", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "بحث بالاسم، رقم الهاتف أو الفوج..." : "Rechercher par nom, téléphone, groupe..."}
            style={{
              width: "100%", height: 38, padding: isRTL ? "0 34px 0 12px" : "0 12px 0 34px", borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13, color: C.ink,
              outline: "none", background: "rgba(255,255,255,0.06)", boxSizing: "border-box"
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: isRTL ? "auto" : 10, left: isRTL ? 10 : "auto", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Hierarchy filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          
          <select
            value={filterCycle}
            onChange={e => { setFilterCycle(e.target.value); setFilterLevel("all"); setSelectedGroupFilter("all"); }}
            style={{ height: 36, padding: "0 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.06)", color: C.ink, fontSize: 12.5, fontWeight: 600, outline: "none" }}
          >
            <option value="all">{lang === "ar" ? "كل الأطوار" : "Tous les cycles"}</option>
            {cycleOptions.map(c => <option key={c} value={c}>{CAT_BY_ID[c]?.label || c}</option>)}
          </select>

          <select
            value={filterLevel}
            onChange={e => { setFilterLevel(e.target.value); setSelectedGroupFilter("all"); }}
            style={{ height: 36, padding: "0 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.06)", color: C.ink, fontSize: 12.5, fontWeight: 600, outline: "none" }}
          >
            <option value="all">{lang === "ar" ? "كل المستويات" : "Tous les niveaux"}</option>
            {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <select
            value={selectedGroupFilter}
            onChange={e => setSelectedGroupFilter(e.target.value)}
            style={{ height: 36, padding: "0 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.06)", color: C.ink, fontSize: 12.5, fontWeight: 600, outline: "none" }}
          >
            <option value="all">{lang === "ar" ? "جميع الأفواج" : "Tous les groupes"}</option>
            {sgOptions.map(sg => (
              <option key={sg.id} value={sg.id}>{sg.nom}</option>
            ))}
          </select>

          {/* Status filter tabs */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 10, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
            {[
              { id: "all", label: lang === "ar" ? "الكل" : "Tous" },
              { id: "has_pass", label: lang === "ar" ? "بكلمة مرور" : "Avec MDP" },
              { id: "paid", label: lang === "ar" ? "التسجيل مسدد" : "Inscrits" },
              { id: "unpaid", label: lang === "ar" ? "التسجيل معلق" : "Non inscrits" },
              { id: "debt", label: lang === "ar" ? "عليهم ديون (ماسلكوش)" : "Impayés" },
              { id: "settled", label: lang === "ar" ? "مستوفين (سلكو)" : "À jour" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id)}
                style={{
                  padding: "5px 10px", borderRadius: 8, border: "none",
                  background: statusFilter === item.id ? C.accent : "transparent",
                  color: statusFilter === item.id ? "#fff" : C.inkSoft,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Student Accounts Cards Grid ─────────────────────── */}
      <div style={{ display: "grid", gap: 12 }}>
        {filteredStudents.map(st => {
          const en = (data.enrollments || []).find(e => e.studentId === st.id && e.academicYearId === activeYearId);
          const stGroupId = en ? en.groupId : null;
          const sg = stGroupId ? groupMap[stGroupId] : null;
          const cat = sg ? CAT_BY_ID[sg.categoryId] : null;
          const isRevealed = !!revealedPasswords[st.id];
          const initials = `${(st.prenom || "")[0] || ""}${(st.nom || "")[0] || ""}`.toUpperCase() || "ST";
          const fin = getStudentFinancialSummary(data, st.id, activeYearId);

          return (
            <div
              key={st.id}
              style={{
                background: C.surface, border: `1px solid ${fin.totalUnpaid > 0 ? "rgba(248,113,113,0.3)" : C.border}`, borderRadius: 16,
                padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 16, flexWrap: "wrap", transition: "border 0.2s, background 0.2s"
              }}
            >
              {/* Left info: Avatar & Names */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: "min(220px, 100%)" }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: cat?.bg || "rgba(226,150,58,0.18)",
                  border: `1.5px solid ${cat?.color || C.accent}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 15, color: cat?.color || C.accent, flexShrink: 0
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15.5, color: C.ink }}>
                      {st.prenom} {st.nom}
                    </span>
                    {sg && (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: cat?.color || C.accent, background: cat?.bg || C.accentSoft,
                        padding: "2px 8px", borderRadius: 999
                      }}>
                        {sg.nom}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <button
                      onClick={() => toggleEnrollmentStatus(st)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 6, border: "none",
                        background: st.enrollmentPaid ? "rgba(74,222,128,0.15)" : "rgba(251,191,36,0.15)",
                        color: st.enrollmentPaid ? "#4ade80" : "#fbbf24",
                        fontSize: 11, fontWeight: 700, cursor: "pointer"
                      }}
                      title={lang === "ar" ? "انقر لتغيير حالة حقوق التسجيل" : "Cliquer pour basculer le statut"}
                    >
                      {st.enrollmentPaid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {st.enrollmentPaid ? (lang === "ar" ? "حقوق التسجيل مسواة" : "Inscription réglée") : (lang === "ar" ? "حقوق التسجيل غير مدفوعة" : "Inscription non réglée")}
                    </button>
                    {st.enrollmentDate && (
                      <span style={{ fontSize: 11, color: C.inkSoft }}>
                        {lang === "ar" ? "تاريخ التسجيل:" : "Inscrit le :"} {st.enrollmentDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center box: Credentials info (Phone & Password) */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                background: "rgba(255,255,255,0.04)", padding: "8px 14px", borderRadius: 12, border: `1px solid ${C.border}`,
                maxWidth: "100%", boxSizing: "border-box"
              }}>
                {/* Identifier / Phone */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {lang === "ar" ? "معرّف الدخول" : "Identifiant"}
                  </div>
                  <div className="f-mono" style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                    {st.phone || "—"}
                  </div>
                </div>

                <div style={{ width: 1, height: 26, background: C.border }} />

                {/* Password display & quick actions */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {lang === "ar" ? "كلمة المرور" : "Mot de passe"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                    <span className="f-mono" style={{ fontSize: 13.5, fontWeight: 700, color: st.password ? C.accent : "#f87171" }}>
                      {st.password
                        ? (isRevealed ? st.password : "••••••")
                        : (lang === "ar" ? "غير محددة" : "Non défini")}
                    </span>

                    {st.password && (
                      <button
                        onClick={() => toggleRevealPassword(st.id)}
                        style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
                        title={isRevealed ? (lang === "ar" ? "إخفاء" : "Masquer") : (lang === "ar" ? "إظهار" : "Afficher")}
                      >
                        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Box: شحال سلك / شحال ماسلكش */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                background: fin.totalUnpaid > 0 ? "rgba(248,113,113,0.06)" : "rgba(74,222,128,0.06)",
                border: `1px solid ${fin.totalUnpaid > 0 ? "rgba(248,113,113,0.28)" : "rgba(74,222,128,0.28)"}`,
                padding: "8px 14px", borderRadius: 12, maxWidth: "100%", boxSizing: "border-box"
              }}>
                {/* Paid / شحال سلك */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={11} />
                    {lang === "ar" ? "المسدد (سلك)" : "Payé"}
                  </div>
                  <div className="f-mono" style={{ fontSize: 13.5, fontWeight: 800, color: "#4ade80", marginTop: 1 }}>
                    {fin.totalPaid.toLocaleString()} DA
                  </div>
                </div>

                <div style={{ width: 1, height: 26, background: fin.totalUnpaid > 0 ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)" }} />

                {/* Unpaid / شحال ماسلكش */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: fin.totalUnpaid > 0 ? "#f87171" : "#4ade80", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>
                    {fin.totalUnpaid > 0 ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
                    {lang === "ar" ? "المتبقي (ماسلكش)" : "Reste à payer"}
                  </div>
                  <div className="f-mono" style={{ fontSize: 13.5, fontWeight: 800, color: fin.totalUnpaid > 0 ? "#f87171" : "#4ade80", marginTop: 1 }}>
                    {fin.totalUnpaid > 0 ? `${fin.totalUnpaid.toLocaleString()} DA` : (lang === "ar" ? "مستوفى الكل ✓" : "À jour ✓")}
                  </div>
                </div>
              </div>

              {/* Right actions: Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {/* Change password button */}
                <button
                  onClick={() => setPasswordTarget(st)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 12px", borderRadius: 10,
                    background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.35)",
                    color: C.accent, fontSize: 12.5, fontWeight: 700, cursor: "pointer"
                  }}
                  title={lang === "ar" ? "إدارة وتغيير كلمة المرور" : "Gérer / changer mot de passe"}
                >
                  <KeyRound size={14} />
                  {lang === "ar" ? "تغيير كلمة المرور" : "Mot de passe"}
                </button>

                {/* Share / Copy credentials message */}
                <IconBtn
                  icon={Share2}
                  onClick={() => handleCopyCredentials(st)}
                  title={lang === "ar" ? "نسخ معلومات الدخول لإرسالها للتلميذ" : "Copier les identifiants pour partage"}
                />

                {/* Open Chat */}
                <IconBtn
                  icon={MessageCircle}
                  onClick={() => openChat(st.id)}
                  title={lang === "ar" ? "مراسلة التلميذ" : "Messagerie avec l'élève"}
                />

                {/* Send Direct Notification */}
                <IconBtn
                  icon={Bell}
                  onClick={() => setNotifTarget(st)}
                  title={lang === "ar" ? "إرسال إشعار فوري" : "Envoyer une notification"}
                />

                {/* Edit student details */}
                <IconBtn
                  icon={Pencil}
                  onClick={() => setEditTarget(st)}
                  title={lang === "ar" ? "تعديل بيانات التلميذ" : "Modifier"}
                />

                {/* Delete student */}
                <IconBtn
                  icon={Trash2}
                  onClick={() => handleDeleteStudent(st)}
                  title={lang === "ar" ? "حذف الحساب" : "Supprimer"}
                />
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(226,150,58,0.12)", border: "1px solid rgba(226,150,58,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <Users size={32} color={C.accent} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>
              {lang === "ar" ? "مكان حتى حساب تلميذ (لا يوجد حساب)" : "Aucun compte étudiant (Makan hata compte)"}
            </div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 6, maxWidth: 440, margin: "6px auto 0" }}>
              {search
                ? (lang === "ar" ? "جرب البحث بكلمات أخرى أو تغيير الفلتر" : "Essayez avec d'autres termes de recherche")
                : (lang === "ar" ? "القائمة فارغة حالياً. يمكنك إضافة حساب تلميذ جديد أو الرجوع للخلف." : "La liste est actuellement vide. Vous pouvez ajouter un nouveau compte ou revenir en arrière.")}
            </div>
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              {onBack && (
                <button
                  onClick={onBack}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "9px 18px", borderRadius: 12,
                    background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`,
                    color: C.ink, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                  {lang === "ar" ? "رجوع" : "Retour"}
                </button>
              )}
              <PrimaryBtn onClick={() => setShowAddModal(true)}>
                <Plus size={15} />
                {lang === "ar" ? "إضافة حساب جديد" : "Créer un compte"}
              </PrimaryBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {passwordTarget && (
        <PasswordModal
          student={passwordTarget}
          onClose={() => setPasswordTarget(null)}
          onSave={handleSavePassword}
        />
      )}

      {notifTarget && (
        <SendNotificationModal
          student={notifTarget}
          onClose={() => setNotifTarget(null)}
          onSend={handleSendDirectNotif}
        />
      )}

      {(showAddModal || editTarget) && (
        <StudentFormModal
          initial={editTarget || null}
          groupId={editTarget?.groupId || ""}
          allStudents={students}
          allGroups={groups}
          enrollmentFee={data.settings?.enrollmentFee || 500}
          onClose={() => { setShowAddModal(false); setEditTarget(null); }}
          onSave={handleSaveStudentAccount}
        />
      )}
    </div>
  );
}
