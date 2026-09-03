import React, { useState, useRef, useEffect } from "react";
import { Menu, Search, CalendarClock, Users, MessageCircle, LogOut, Settings, ChevronDown, Bell, Radio } from "lucide-react";
import { C, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import IconBtn from "../../components/ui/IconBtn";
import AvatarDisplay from "../../components/ui/AvatarDisplay";
import LanguageToggle from "../../components/ui/LanguageToggle";
import AppSidebar from "../../components/AppSidebar";
import GlobalSearch from "../../components/GlobalSearch";

// Nouvelles pages
import DashboardScreen from "./DashboardScreen";
import SchoolStructureScreen from "./SchoolStructureScreen";
import SubgroupScreen from "./SubgroupScreen";
import StudentScreen from "./StudentScreen";
import CalendarScreen from "./CalendarScreen";
import CommunicationScreen from "./CommunicationScreen";
import FinancialScreen from "./FinancialScreen";
import NfcAttendanceScreen from "./NfcAttendanceScreen";

// Anciennes pages (conservées)
import ParentsScreen from "./ParentsScreen";
import SettingsScreen from "./SettingsScreen";

export default function AdminApp({ data, setData, onLogout, toastFn }) {
  const { t, isRTL, lang } = useLanguage();
  
  const [nav, setNav] = useState({ screen: "dashboard" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Profile & Notif dropdowns
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const handleNav = (navState) => setNav(navState);
  
  const goBack = () => {
    if (nav.screen === "student") {
      const st = data.students.find(s => s.id === nav.studentId);
      if (st) setNav({ screen: "subgroup", subgroupId: st.subgroupId });
      else setNav({ screen: "dashboard" });
    } else if (nav.screen === "subgroup") {
      const sg = data.subgroups.find(s => s.id === nav.subgroupId);
      if (sg) setNav({ screen: "structure", catId: sg.categoryId, levelId: sg.levelId, groupType: sg.groupType });
      else setNav({ screen: "dashboard" });
    } else {
      setNav({ screen: "dashboard" });
    }
  };

  const notifications = (data.userNotifications || []).filter(n => n.userId === "admin").reverse();
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const markAllNotifsRead = () => {
    setData(d => ({
      ...d,
      userNotifications: (d.userNotifications || []).map(n => n.userId === "admin" ? { ...n, read: true } : n)
    }));
  };

  const handleNotifClick = (notif) => {
    // Mark this notification as read
    setData(d => ({
      ...d,
      userNotifications: (d.userNotifications || []).map(n => n.id === notif.id ? { ...n, read: true } : n)
    }));
    setNotifOpen(false);

    if (notif.meta?.screen === "chat") {
      setNav({
        screen: "chat",
        studentId: notif.meta.studentId,
        subgroupId: notif.meta.subgroupId
      });
    } else if (notif.meta?.screen === "parents") {
      setNav({ screen: "parents" });
    }
  };

  return (
    <div className="f-body" style={{ minHeight: "100vh", background: C.bg }}>
      {/* ── Topbar ─────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, ...C.glassStyle, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none", padding: "12px 0" }}>
        <div className="topbar-inner" style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <IconBtn icon={Menu} onClick={() => setSidebarOpen(true)} title={lang === "ar" ? "القائمة" : "Menu"} />
          
          <GlobalSearch data={data} onNav={handleNav} />
          
          <div style={{ display: "flex", gap: 8, marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0, alignItems: "center" }}>
            <IconBtn icon={Radio} onClick={() => handleNav({ screen: "nfc" })} title={lang === "ar" ? "تسجيل الحضور بالبطاقة (NFC)" : "Pointage NFC"} />
            <LanguageToggle />
            
            {/* Notifications Dropdown */}
            <div style={{ position: "relative" }}>
              <IconBtn icon={Bell} onClick={() => setNotifOpen(!notifOpen)} title={lang === "ar" ? "الإشعارات" : "Notifications"} badge={unreadNotifs} />
              {notifOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto",
                  width: 340, maxWidth: "calc(100vw - 24px)", maxHeight: 420, overflowY: "auto",
                  background: "linear-gradient(160deg, rgba(22,18,71,0.98) 0%, rgba(45,30,12,0.95) 55%, rgba(18,50,60,0.98) 100%)",
                  backdropFilter: "blur(24px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.65)", borderRadius: 18, zIndex: 200, padding: 14
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                    <h4 style={{ margin: 0, fontSize: 14, color: "#fff", fontWeight: 700 }}>
                      {lang === "ar" ? "الإشعارات" : "Notifications"}
                      {unreadNotifs > 0 && (
                        <span style={{ marginLeft: 6, background: C.accent, color: "#120e2e", fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>
                          {unreadNotifs}
                        </span>
                      )}
                    </h4>
                    {unreadNotifs > 0 && (
                      <button
                        onClick={markAllNotifsRead}
                        style={{ background: "none", border: "none", color: C.accent, fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
                      >
                        {lang === "ar" ? "تحديد الكل كمقروء" : "Tout marquer comme lu"}
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ textAlign: "center", color: C.inkSoft, fontSize: 13, padding: "24px 0" }}>
                      {lang === "ar" ? "لا توجد إشعارات حالياً" : "Aucune notification pour le moment"}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {notifications.map(n => {
                        const isUnread = !n.read;
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            style={{
                              background: isUnread ? "rgba(226,150,58,0.14)" : "rgba(255,255,255,0.05)",
                              border: `1px solid ${isUnread ? "rgba(226,150,58,0.45)" : C.border}`,
                              borderRadius: 12,
                              padding: "10px 12px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              position: "relative"
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                            onMouseLeave={e => e.currentTarget.style.borderColor = isUnread ? "rgba(226,150,58,0.45)" : C.border}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {isUnread && (
                                  <span style={{ width: 6, height: 6, borderRadius: 999, background: C.accent, display: "inline-block" }} />
                                )}
                                <span style={{ fontSize: 11.5, fontWeight: 800, color: isUnread ? C.accent : "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>
                                  {n.title}
                                </span>
                              </div>
                              <span style={{ fontSize: 10, color: C.inkSoft }}>{n.date} {n.time}</span>
                            </div>
                            <div style={{ fontSize: 12.5, color: isUnread ? "#fff" : C.ink, lineHeight: 1.4 }}>
                              {n.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <span className="hide-on-mobile-sm">
              <IconBtn icon={CalendarClock} onClick={() => setNav({ screen: "calendar" })} active={nav.screen === "calendar"} title={lang === "ar" ? "الجدول الزمني" : "Calendrier"} />
            </span>
            <span className="hide-on-mobile-sm">
              <IconBtn icon={MessageCircle} onClick={() => setNav({ screen: "chat" })} active={nav.screen === "chat"} title={t("messagesNav")} />
            </span>
            
            {/* Profile Dropdown */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                style={{
                  height: 40, display: "flex", alignItems: "center", gap: 8,
                  padding: isRTL ? "0 8px 0 12px" : "0 12px 0 8px",
                  border: profileOpen || nav.screen === "settings" ? "1.5px solid rgba(226,150,58,0.8)" : "1px solid rgba(255,255,255,0.22)",
                  background: profileOpen || nav.screen === "settings" ? "linear-gradient(135deg,rgba(226,150,58,0.35),rgba(226,150,58,0.15))" : "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)", borderRadius: 12, color: "#fff", cursor: "pointer", transition: "all .18s ease",
                }}
              >
                <AvatarDisplay avatar={data.admin.avatar} size={26} style={{ border: "none", boxShadow: "none", background: "transparent" }} />
                <div className="hide-on-mobile-xs" style={{ textAlign: isRTL ? "right" : "left", lineHeight: 1.15 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{data.admin.prenom} {data.admin.nom}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)" }}>@{data.admin.username}</div>
                </div>
                <ChevronDown size={13} color="rgba(255,255,255,0.6)" style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>

              {profileOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto",
                  width: 220, maxWidth: "calc(100vw - 24px)", background: "linear-gradient(160deg, rgba(22,18,71,0.96) 0%, rgba(71,48,18,0.92) 55%, rgba(18,68,71,0.96) 100%)",
                  backdropFilter: "blur(24px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)", borderRadius: 18, overflow: "hidden", zIndex: 200,
                }}>
                  <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", gap: 12 }}>
                    <AvatarDisplay avatar={data.admin.avatar} size={46} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{data.admin.prenom} {data.admin.nom}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>@{data.admin.username}</div>
                    </div>
                  </div>
                  <div style={{ padding: "8px 8px" }}>
                    <button
                      onClick={() => { setNav({ screen: "settings" }); setProfileOpen(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", color: "rgba(255,255,255,0.88)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", textAlign: isRTL ? "right" : "left" }}
                    >
                      <Settings size={15} color="rgba(226,150,58,0.85)" /> {t("settingsNav")}
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); onLogout(); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", color: "rgba(248,113,113,0.9)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", textAlign: isRTL ? "right" : "left", marginTop: 2 }}
                    >
                      <LogOut size={15} color="rgba(248,113,113,0.85)" /> {t("logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        nav={nav}
        onNav={handleNav}
        data={data}
      />

      {/* ── Main content area ── */}
      <div className="main-content-layout" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
        {nav.screen === "dashboard" && <DashboardScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} />}
        {nav.screen === "structure" && <SchoolStructureScreen catId={nav.catId} levelId={nav.levelId} groupType={nav.groupType} data={data} setData={setData} toastFn={toastFn} onNav={handleNav} />}
        {nav.screen === "subgroup" && <SubgroupScreen subgroupId={nav.subgroupId} openSessionId={nav.openSessionId} data={data} setData={setData} toastFn={toastFn} onBack={goBack} onNav={handleNav} />}
        {nav.screen === "student" && <StudentScreen studentId={nav.studentId} data={data} setData={setData} toastFn={toastFn} onBack={goBack} onNav={handleNav} />}
        {nav.screen === "calendar" && <CalendarScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} />}
        {nav.screen === "chat" && <CommunicationScreen data={data} setData={setData} initialTarget={nav} onBack={goBack} />}
        {nav.screen === "finance" && <FinancialScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} />}
        {nav.screen === "nfc" && <NfcAttendanceScreen data={data} setData={setData} toastFn={toastFn} onBack={goBack} onNav={handleNav} />}

        {nav.screen === "parents" && <ParentsScreen data={data} setData={setData} toastFn={toastFn} openChat={(sid) => handleNav({ screen: "chat", studentId: sid, parentId: sid })} onBack={goBack} />}
        {nav.screen === "settings" && <SettingsScreen admin={data.admin} toastFn={toastFn} onSave={(a) => setData(d => ({ ...d, admin: a }))} onBack={goBack} />}
      </div>
    </div>
  );
}
