import React, { useState } from "react";
import { ArrowLeft, Edit2, CheckCircle2, XCircle, CreditCard, CalendarDays, TrendingUp, Shield, Key, Radio } from "lucide-react";
import { C, CAT_BY_ID, computeCycles, getStudentFinancialSummary, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import StudentFormModal from "./StudentFormModal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import { notifyPaymentReceived, notifyAccountUpdated } from "../../utils/notificationEngine";

function AlertTriangle(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke={props.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
}

export default function StudentScreen({ studentId, data, setData, toastFn, onBack, onNav }) {
  const { lang } = useLanguage();
  const [showEdit, setShowEdit] = useState(false);

  const st = data.students.find(s => s.id === studentId);
  if (!st) return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "التلميذ غير موجود" : "Élève introuvable"}</div>;

  const sg = [...(data.groups || [])].find(s => s.id === st.groupId);
  const cat = sg ? CAT_BY_ID[sg.categoryId] : null;

  // Stats & data
  const attendances = data.attendances.filter(a => a.studentId === st.id);
  const totalSessions = attendances.length;
  const presentCount = attendances.filter(a => a.present).length;
  const absentCount = totalSessions - presentCount;
  const presenceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  const payments = data.payments.filter(p => p.studentId === st.id).sort((a, b) => (a.cycleNum || 0) - (b.cycleNum || 0));
  const unpaidPmtCount = payments.filter(p => !p.paid).length;
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

      {/* ── Status badges ──────────────────────────────────────── */}
      {(() => {
        const fin = getStudentFinancialSummary(data, st.id, data.activeYearId); // Note: AdminApp passes activeYearId
        return (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {/* Monthly Price */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "rgba(226,150,58,0.12)", border: "1px solid rgba(226,150,58,0.3)" }}>
              <CreditCard size={18} color={C.accent} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, textTransform: "uppercase" }}>
                  {lang === "ar" ? "السعر الشهري" : "Prix mensuel"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>
                  {studentPrice.toLocaleString()} DA
                </div>
              </div>
            </div>

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

            {/* Previous Debt (only if > 0) */}
            {fin.previousDebtRemaining > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)" }}>
                <AlertTriangle size={18} color="#f87171" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#f87171", textTransform: "uppercase" }}>
                    {lang === "ar" ? "دين سابق" : "Dette Précédente"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>
                    {fin.previousDebtRemaining.toLocaleString()} DA
                  </div>
                </div>
              </div>
            )}

            {/* Total Paid */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}>
              <CheckCircle2 size={18} color="#4ade80" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#4ade80", textTransform: "uppercase" }}>
                  {lang === "ar" ? "إجمالي المسدد" : "Total payé (Année)"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>
                  {fin.totalPaid.toLocaleString()} DA
                </div>
              </div>
            </div>

            {/* Total Unpaid */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: fin.totalUnpaid > 0 ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)", border: `1px solid ${fin.totalUnpaid > 0 ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}` }}>
              {fin.totalUnpaid > 0 ? <AlertTriangle size={18} color="#f87171" /> : <CheckCircle2 size={18} color="#4ade80" />}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: fin.totalUnpaid > 0 ? "#f87171" : "#4ade80", textTransform: "uppercase" }}>
                  {lang === "ar" ? "إجمالي المتبقي" : "Reste à payer (Total)"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: fin.totalUnpaid > 0 ? "#f87171" : "#4ade80" }}>
                  {fin.totalUnpaid > 0 ? `${fin.totalUnpaid.toLocaleString()} DA` : (lang === "ar" ? "مستوفى ✓" : "À jour ✓")}
                </div>
              </div>
            </div>

            {/* NFC Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: st.nfcCardId ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.06)", border: `1px solid ${st.nfcCardId ? "rgba(74,222,128,0.3)" : C.border}` }}>
              <Radio size={18} color={st.nfcCardId ? "#4ade80" : C.inkSoft} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: st.nfcCardId ? "#4ade80" : C.inkSoft, textTransform: "uppercase" }}>NFC</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: st.nfcCardId ? "#4ade80" : C.inkSoft }}>
                  {st.nfcCardId ? (lang === "ar" ? "متصل ✓" : "Connected ✓") : (lang === "ar" ? "غير متصل" : "Not connected")}
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: st.accountStatus === "active" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", border: `1px solid ${st.accountStatus === "active" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
              <Shield size={18} color={st.accountStatus === "active" ? "#4ade80" : "#f87171"} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: st.accountStatus === "active" ? "#4ade80" : "#f87171", textTransform: "uppercase" }}>
                  {lang === "ar" ? "الحساب" : "Compte"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: st.accountStatus === "active" ? "#4ade80" : "#f87171" }}>
                  {st.accountStatus === "active" ? (lang === "ar" ? "نشط ✓" : "Actif ✓") : (lang === "ar" ? "معطل ✗" : "Inactif ✗")}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Admin Actions ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          onClick={resetPassword}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.07)", color: C.inkSoft, cursor: "pointer", transition: "all 0.15s" }}
        >
          <Key size={14} /> {lang === "ar" ? "إعادة تعيين كلمة المرور" : "Reset Password"}
        </button>
        <button
          onClick={toggleAccountStatus}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${st.accountStatus === "active" ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
            background: st.accountStatus === "active" ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
            color: st.accountStatus === "active" ? "#f87171" : "#4ade80",
            cursor: "pointer", transition: "all 0.15s"
          }}
        >
          <Shield size={14} /> {st.accountStatus === "active" ? (lang === "ar" ? "تعطيل الحساب" : "Désactiver") : (lang === "ar" ? "تفعيل الحساب" : "Activer")}
        </button>
      </div>

      <div className="student-screen-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
            {lang === "ar" ? "سجل المدفوعات" : "Historique des paiements"}
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {payments.length === 0 ? (
              <div style={{ textAlign: "center", color: C.inkSoft, padding: "20px 0", fontSize: 13, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                {lang === "ar" ? "لا توجد دفعات مسجلة" : "Aucun paiement enregistré"}
              </div>
            ) : (
              payments.map(p => (
                <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
      </div>

      {showEdit && (
        <StudentFormModal
          groupId={st.groupId}
          initial={st}
          enrollmentFee={data.settings?.enrollmentFee || 500}
          allStudents={data.students || []}
          allGroups={data.groups || []}
          allSubgroups={data.groups || []}
          onClose={() => setShowEdit(false)}
          onSave={saveStudent}
        />
      )}
    </div>
  );
}
