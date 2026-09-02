import React, { useState } from "react";
import { GraduationCap, Bell, MessageCircle, LogOut, CheckCircle2, XCircle } from "lucide-react";
import { C } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import IconBtn from "../../components/ui/IconBtn";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import Pill from "../../components/ui/Pill";
import AttendanceDots from "../../components/ui/AttendanceDots";
import LanguageToggle from "../../components/ui/LanguageToggle";
import CommGroupsScreen from "../admin/CommGroupsScreen";

export default function ParentApp({ data, setData, parentId, onLogout, toastFn }) {
  const { t, isRTL, lang } = useLanguage();
  const [screen, setScreen] = useState("dashboard");
  const [showNotifs, setShowNotifs] = useState(false);
  const parent = data.parents.find(p => p.id === parentId);
  const student = data.students.find(s => s.id === parent?.studentId);
  const group = student ? data.groups.find(g => g.id === student.groupId) : null;
  const myNotifs = data.notifications.filter(n => n.parentId === parentId).sort((a, b) => b.ts - a.ts);
  const unread = myNotifs.filter(n => !n.read).length;

  const presentCount = student ? student.presences.filter(Boolean).length : 0;
  const absentCount = student ? student.presences.filter(p => !p).length : 0;

  const getNiveauLabel = (n) => {
    if (n === "Primaire") return t("primaire");
    if (n === "CEM") return t("cem");
    if (n === "Lycée") return t("lycee");
    return n;
  };

  const getTypeLabel = (tp) => {
    if (tp === "Normal") return t("typeNormal");
    if (tp === "Spécial") return t("typeSpecial");
    if (tp === "Individuel") return t("typeIndividuel");
    return tp;
  };

  const openNotifs = () => {
    setShowNotifs(v => !v);
    if (!showNotifs) setData(d => ({ ...d, notifications: d.notifications.map(n => n.parentId === parentId ? { ...n, read: true } : n) }));
  };

  return (
    <div className="f-body" style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 700, margin: "0 auto" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={18} color={C.accent} />
          </div>
          <div style={{ fontWeight: 700, color: C.ink }}>{t("parentPortalTitle")}</div>
          <div style={{ marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0, position: "relative", display: "flex", gap: 6, alignItems: "center" }}>
            <LanguageToggle />
            <IconBtn icon={Bell} onClick={openNotifs} badge={unread} title={t("notifications")} />
            <IconBtn icon={MessageCircle} onClick={() => setScreen(screen === "chat" ? "dashboard" : "chat")} active={screen === "chat"} title={t("messagesNav")} />
            <IconBtn icon={LogOut} onClick={onLogout} title={t("logout")} />
            {showNotifs && (
              <div style={{
                position: "absolute", top: 46, right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto", width: 300,
                ...C.glassStyle,
                borderRadius: 14,
                boxShadow: "0 16px 36px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
                maxHeight: 320, overflowY: "auto",
                zIndex: 60,
                textAlign: isRTL ? "right" : "left",
              }}>
                <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{t("notifications")}</span>
                  {unread > 0 && <span style={{ fontSize: 11, background: C.accent, color: "#fff", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>{unread} {t("notificationsBadgeNew")}</span>}
                </div>
                {myNotifs.length === 0 && <div style={{ padding: 16, color: C.inkSoft, fontSize: 13, textAlign: "center" }}>{t("noNotifications")}</div>}
                {myNotifs.map(n => (
                  <div key={n.id} style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.ink, background: n.read ? "transparent" : "rgba(226,150,58,0.12)" }}>
                    <div style={{ color: "#ffffff", fontWeight: n.read ? 400 : 600 }}>{n.text}</div>
                    <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>{new Date(n.ts).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 18px 60px" }}>
        {screen === "chat" ? (
          <CommGroupsScreen data={data} setData={setData} role="parent" parentId={parentId} onBack={() => setScreen("dashboard")} />
        ) : !student ? (
          <p style={{ color: C.inkSoft }}>{t("noStudentLinked")}</p>
        ) : (
          <>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: C.accent }}>
                  {student.prenom[0]}{student.nom[0]}
                </div>
                <div>
                  <div className="f-display" style={{ fontSize: 20, fontWeight: 600, color: C.ink }}>{student.prenom} {student.nom}</div>
                  <div style={{ fontSize: 13, color: C.inkSoft }}>{student.age} {isRTL ? "سنة" : "ans"} · {group ? `${group.nom} · ${getNiveauLabel(group.niveau)} ${group.annee} · ${getTypeLabel(group.type)}` : ""}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
                <CheckCircle2 size={22} color={C.good} />
                <div className="f-mono" style={{ fontSize: 26, fontWeight: 700, color: C.ink, margin: "6px 0 2px" }}>{presentCount}</div>
                <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{t("monthlyPresences")}</div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
                <XCircle size={22} color={C.bad} />
                <div className="f-mono" style={{ fontSize: 26, fontWeight: 700, color: C.ink, margin: "6px 0 2px" }}>{absentCount}</div>
                <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{t("monthlyAbsences")}</div>
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 10 }}>{t("sessionsDetail")}</div>
              <AttendanceDots presences={student.presences} />
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, color: C.ink, fontSize: 14.5 }}>{t("monthlyPrice")}</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft }}>4 {t("sessionsCount")}</div>
              </div>
              <Pill good={student.paye}>{student.paye ? t("paid") : t("unpaid")}</Pill>
            </div>

            <div style={{ marginTop: 18, textAlign: "center" }}>
              <PrimaryBtn onClick={() => setScreen("chat")}><MessageCircle size={16} /> {t("messagesNav")}</PrimaryBtn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
