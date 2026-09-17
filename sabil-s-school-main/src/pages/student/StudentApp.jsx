import React, { useState, useRef, useEffect } from "react";
import { Menu, LogOut, CalendarClock, MessageCircle, Home, User as UserIcon, Bell, ChevronDown } from "lucide-react";
import { C, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import IconBtn from "../../components/ui/IconBtn";
import AvatarDisplay from "../../components/ui/AvatarDisplay";
import LanguageToggle from "../../components/ui/LanguageToggle";

import StudentDashboard from "./StudentDashboard";
import StudentCalendar from "./StudentCalendar";
import StudentChat from "./StudentChat";

function StudentSidebar({ open, onClose, nav, onNav }) {
  const { lang } = useLanguage();
  
  const isActive = (screen) => nav.screen === screen;
  
  const itemStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 14px", borderRadius: 12,
    border: active ? "1px solid rgba(226,150,58,0.45)" : "1px solid transparent",
    background: active ? "rgba(226,150,58,0.15)" : "transparent",
    color: active ? "#fff" : "rgba(255,255,255,0.8)",
    fontSize: 14, fontWeight: active ? 700 : 500,
    cursor: "pointer", transition: "all 0.15s ease",
    marginBottom: 4, width: "100%", textAlign: "left",
  });

  const go = (screen) => { onNav({ screen }); onClose(); };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, backdropFilter: open ? "blur(12px) brightness(0.55)" : "blur(0px)", background: open ? "rgba(10,8,30,0.45)" : "transparent", transition: "all .35s ease", pointerEvents: open ? "auto" : "none" }} />
      <div className="f-body" style={{ position: "fixed", top: 65, left: 18, width: 280, maxWidth: "calc(100vw - 28px)", maxHeight: "calc(100vh - 100px)", zIndex: 95, overflowY: "auto", padding: "16px 14px 40px", borderRadius: "24px 24px 120px 120px", background: "linear-gradient(160deg,rgba(22,18,71,0.96) 0%,rgba(71,48,18,0.92) 55%,rgba(18,68,71,0.96) 100%)", backdropFilter: "blur(20px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 32px 64px rgba(0,0,0,0.45)", transform: open ? "translateX(0)" : "translateX(-360px)", opacity: open ? 1 : 0, transition: "transform .32s cubic-bezier(.22,1,.36,1), opacity .25s ease", pointerEvents: open ? "auto" : "none" }}>
        
        <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", padding: "14px 12px 6px" }}>
          {lang === "ar" ? "القائمة الرئيسية" : "Menu principal"}
        </div>
        
        <button style={itemStyle(isActive("dashboard"))} onClick={() => go("dashboard")}>
          <Home size={18} color={C.accent} /> {lang === "ar" ? "الرئيسية" : "Accueil"}
        </button>
        <button style={itemStyle(isActive("calendar"))} onClick={() => go("calendar")}>
          <CalendarClock size={18} color={C.accent} /> {lang === "ar" ? "رزنامتي" : "Mon calendrier"}
        </button>
        <button style={itemStyle(isActive("chat"))} onClick={() => go("chat")}>
          <MessageCircle size={18} color={C.accent} /> {lang === "ar" ? "التواصل" : "Communication"}
        </button>
      </div>
    </>
  );
}

export default function StudentApp({ data, setData, studentId, onLogout, toastFn }) {
  const { lang, isRTL } = useLanguage();
  const [nav, setNav] = useState({ screen: "dashboard" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const student = (data.students || []).find(s => s.id === studentId);
  const enrollment = (data.enrollments || []).find(e => e.studentId === studentId);
  const activeGroupId = student?.groupId || enrollment?.groupId;
  const sg = (data.groups || []).find(s => s.id === activeGroupId);
  const cat = sg ? CAT_BY_ID[sg.categoryId] : null;

  if (!student) {
    return <div style={{ color: "#fff", textAlign: "center", padding: 40 }}>{lang === "ar" ? "حساب غير موجود" : "Compte introuvable"}</div>;
  }

  const notifications = (data.userNotifications || []).filter(n => n.userId === studentId).reverse();
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const markNotifsRead = () => {
    if (unreadNotifs === 0) return;
    setData(d => ({
      ...d,
      userNotifications: (d.userNotifications || []).map(n => n.userId === studentId ? { ...n, read: true } : n)
    }));
  };

  return (
    <div className="f-body" style={{ minHeight: "100vh", background: C.bg }}>
      {/* ── Topbar ─────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, ...C.glassStyle, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none", padding: "12px 0" }}>
        <div className="topbar-inner" style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <IconBtn icon={Menu} onClick={() => setSidebarOpen(true)} title={lang === "ar" ? "القائمة" : "Menu"} />
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{lang === "ar" ? "فضاء التلميذ" : "Espace Élève"}</span>
            {cat && (
              <span style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: cat.bg, padding: "2px 8px", borderRadius: 999 }}>
                {sg?.nom}
              </span>
            )}
          </div>
          
          <div style={{ display: "flex", gap: 8, marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0, alignItems: "center" }}>
            <LanguageToggle />
            
            {/* ── Notifications Dropdown ── */}
            <div style={{ position: "relative" }}>
              <IconBtn icon={Bell} onClick={() => { setNotifOpen(!notifOpen); markNotifsRead(); }} title={lang === "ar" ? "الإشعارات" : "Notifications"} badge={unreadNotifs} />
              
              {notifOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto",
                  width: 320, maxWidth: "calc(100vw - 24px)", maxHeight: 400, overflowY: "auto",
                  background: "linear-gradient(160deg, rgba(22,18,71,0.96) 0%, rgba(71,48,18,0.92) 55%, rgba(18,68,71,0.96) 100%)",
                  backdropFilter: "blur(24px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.55)", borderRadius: 18, zIndex: 200,
                  padding: 12
                }}>
                  <h4 style={{ margin: "0 0 10px 4px", fontSize: 14, color: "#fff" }}>{lang === "ar" ? "الإشعارات" : "Notifications"}</h4>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: "center", color: C.inkSoft, fontSize: 13, padding: "20px 0" }}>{lang === "ar" ? "لا توجد إشعارات" : "Aucune notification"}</div>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {notifications.map(n => {
                        const colors = {
                          info: { c: "#818cf8", bg: "rgba(99,102,241,0.15)" },
                          payment: { c: "#f87171", bg: "rgba(248,113,113,0.15)" },
                          presence: { c: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
                          session: { c: "#4ade80", bg: "rgba(74,222,128,0.15)" }
                        }[n.type] || { c: C.inkSoft, bg: "rgba(255,255,255,0.05)" };
                        
                        return (
                          <div key={n.id} style={{ background: n.read ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: colors.c, textTransform: "uppercase" }}>{n.title}</span>
                              <span style={{ fontSize: 10, color: C.inkSoft }}>{n.date} {n.time}</span>
                            </div>
                            <div style={{ fontSize: 13, color: C.ink }}>{n.message}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Profile Dropdown ── */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                style={{
                  height: 40, display: "flex", alignItems: "center", gap: 8,
                  padding: isRTL ? "0 8px 0 12px" : "0 12px 0 8px",
                  border: profileOpen ? "1.5px solid rgba(226,150,58,0.8)" : "1px solid rgba(255,255,255,0.22)",
                  background: profileOpen ? "linear-gradient(135deg,rgba(226,150,58,0.35),rgba(226,150,58,0.15))" : "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)", borderRadius: 12, color: "#fff", cursor: "pointer", transition: "all .18s ease",
                }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: C.accent }}>
                  {student.prenom[0]}{student.nom[0]}
                </div>
                <div className="hide-on-mobile-xs" style={{ textAlign: isRTL ? "right" : "left", lineHeight: 1.15 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{student.prenom} {student.nom}</div>
                </div>
                <ChevronDown size={13} color="rgba(255,255,255,0.6)" style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>

              {profileOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto",
                  width: 200, background: "linear-gradient(160deg, rgba(22,18,71,0.96) 0%, rgba(71,48,18,0.92) 55%, rgba(18,68,71,0.96) 100%)",
                  backdropFilter: "blur(24px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.55)", borderRadius: 18, overflow: "hidden", zIndex: 200, padding: 8
                }}>
                  <button
                    onClick={() => { setProfileOpen(false); onLogout(); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", color: "rgba(248,113,113,0.9)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", textAlign: isRTL ? "right" : "left" }}
                  >
                    <LogOut size={15} color="rgba(248,113,113,0.85)" /> {lang === "ar" ? "تسجيل الخروج" : "Déconnexion"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} nav={nav} onNav={setNav} />

      <div className="main-content-layout" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
        {nav.screen === "dashboard" && <StudentDashboard student={student} group={sg} data={data} />}
        {nav.screen === "calendar" && <StudentCalendar student={student} group={sg} data={data} />}
        {nav.screen === "chat" && <StudentChat student={student} group={sg} data={data} setData={setData} />}
      </div>
    </div>
  );
}
