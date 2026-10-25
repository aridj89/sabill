import React, { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Search, CalendarClock, Users, MessageCircle, LogOut, Settings, ChevronDown, Bell, Radio, CheckCircle2, AlertTriangle, XCircle, CreditCard, Sparkles, X } from "lucide-react";
import { C, CAT_BY_ID, uid, generateSessions, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import IconBtn from "../../components/ui/IconBtn";
import AvatarDisplay from "../../components/ui/AvatarDisplay";
import LanguageToggle from "../../components/ui/LanguageToggle";
import AppSidebar from "../../components/AppSidebar";
import GlobalSearch from "../../components/GlobalSearch";
import { useNfcReader } from "../../hooks/useNfcReader";
import { API_ENDPOINTS } from "../../config/api";

import DashboardScreen from "./DashboardScreen";
import SchoolStructureScreen from "./SchoolStructureScreen";
import GroupScreen from "./GroupScreen";
import StudentScreen from "./StudentScreen";
import CalendarScreen from "./CalendarScreen";
import CommunicationScreen from "./CommunicationScreen";
import FinancialScreen from "./FinancialScreen";
import NfcAttendanceScreen from "./NfcAttendanceScreen";
import DebtsScreen from "./DebtsScreen";

// Anciennes pages (conservées)
import ParentsScreen from "./ParentsScreen";
import SettingsScreen from "./SettingsScreen";

/* ── Web Audio Beep generator for Global NFC ── */
function playGlobalNfcTone(type = "success") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === "warning") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (_) {}
}

export default function AdminApp({ data, setData, onLogout, toastFn }) {
  const { t, isRTL, lang } = useLanguage();
  
  const [nav, setNav] = useState({ screen: "dashboard" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Find current year or default to first
  const currentYear = (data.academicYears || []).find(y => y.isCurrent) || (data.academicYears || [])[0];
  const [activeYearId, setActiveYearId] = useState(currentYear ? currentYear.id : null);
  
  const currentYearObj = (data.academicYears || []).find(y => y.id === activeYearId);
  const isReadOnlyYear = currentYearObj?.name === "2025_2026";
  
  // Profile & Notif dropdowns
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // ── Global NFC Auto-Attendance Engine ──
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const nfcCooldownMap = useRef(new Map());
  const [nfcBanner, setNfcBanner] = useState(null);
  const nfcBannerTimer = useRef(null);

  const handleGlobalNfcScan = useCallback((rawUid) => {
    if (!rawUid) return;

    // Check if an input for manual UID assignment or typing is currently focused
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      const pl = (activeEl.placeholder || "").toLowerCase();
      const nm = (activeEl.name || "").toLowerCase();
      if (nm.includes("card") || nm.includes("nfc") || pl.includes("nfc") || pl.includes("مرر") || pl.includes("badge")) {
        return;
      }
    }

    const cleanUid = String(rawUid).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!cleanUid || cleanUid.length < 3) return;

    const currentData = dataRef.current || data;
    const now = Date.now();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const timeStr = today.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    // 1. Identify student
    const student = (currentData.students || []).find(s =>
      (s.nfcCardId && s.nfcCardId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === cleanUid) ||
      (s.studentCode && s.studentCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === cleanUid) ||
      s.id === cleanUid
    );

    if (!student) {
      playGlobalNfcTone("error");
      if (nfcBannerTimer.current) clearTimeout(nfcBannerTimer.current);
      setNfcBanner({
        type: "unknown",
        cleanUid,
        time: timeStr,
      });
      nfcBannerTimer.current = setTimeout(() => setNfcBanner(null), 5000);
      return;
    }

    // 2. Anti-duplicate cooldown (10s)
    const lastScan = nfcCooldownMap.current.get(cleanUid);
    if (lastScan && (now - lastScan) < 10000) {
      playGlobalNfcTone("warning");
      const remainingSec = Math.ceil((10000 - (now - lastScan)) / 1000);
      if (nfcBannerTimer.current) clearTimeout(nfcBannerTimer.current);
      setNfcBanner({
        type: "duplicate",
        student,
        time: timeStr,
        remainingSec,
      });
      nfcBannerTimer.current = setTimeout(() => setNfcBanner(null), 3500);
      return;
    }

    nfcCooldownMap.current.set(cleanUid, now);

    // 3. Find group & session
    const studentGroup = (currentData.groups || []).find(g => g.id === student.groupId) ||
                         (currentData.subgroups || []).find(sg => sg.id === (student.subgroupId || student.groupId));

    const todaySession = (currentData.sessions || []).find(s =>
      (s.groupId === studentGroup?.id || s.subgroupId === studentGroup?.id) &&
      s.date === todayStr
    );

    const targetSessionId = todaySession ? todaySession.id : null;

    // 4. Update attendance in state
    setData(prev => {
      const attendances = [...(prev.attendances || [])];
      const existingIdx = attendances.findIndex(a =>
        a.studentId === student.id && (a.date === todayStr || (targetSessionId && a.sessionId === targetSessionId))
      );

      const record = {
        id: existingIdx >= 0 ? attendances[existingIdx].id : uid(),
        studentId: student.id,
        sessionId: targetSessionId,
        date: todayStr,
        originalDate: todayStr,
        time: timeStr,
        present: true,
        nfcVerified: true,
        cardUid: cleanUid,
        createdAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        attendances[existingIdx] = record;
      } else {
        attendances.push(record);
      }

      let sessions = prev.sessions || [];
      if (todaySession && todaySession.status === "planned") {
        sessions = sessions.map(s => s.id === todaySession.id ? { ...s, status: "done" } : s);
      }

      const notif = {
        id: uid(),
        userId: student.id,
        type: "presence",
        title: "Pointage NFC validé ⏱️",
        message: `تم تسجيل حضورك بنجاح عبر البطاقة الذكية (${studentGroup?.nom || ""}) بتاريخ ${todayStr} الساعة ${timeStr}.`,
        date: todayStr,
        time: timeStr,
        read: false,
        cardUid: cleanUid,
      };

      return {
        ...prev,
        attendances,
        sessions,
        userNotifications: [...(prev.userNotifications || []), notif],
      };
    });

    // 5. Asynchronously notify backend API if running
    try {
      fetch(`${API_ENDPOINTS.nfc}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardUid: cleanUid }),
      }).catch(() => {});
    } catch (_) {}

    // 6. Audio chime & visual HUD banner
    playGlobalNfcTone("success");
    const fin = getStudentFinancialSummary(currentData, student.id, activeYearId);

    if (nfcBannerTimer.current) clearTimeout(nfcBannerTimer.current);
    setNfcBanner({
      type: "success",
      student,
      group: studentGroup,
      time: timeStr,
      financial: fin,
      cardUid: cleanUid,
    });
    nfcBannerTimer.current = setTimeout(() => setNfcBanner(null), 5000);
  }, [activeYearId, setData]);

  // Global Keyboard Wedge / HID NFC Listener
  useNfcReader({
    enabled: nav.screen !== "nfc",
    onScan: handleGlobalNfcScan,
  });

  // Global SSE Listener
  useEffect(() => {
    let es = null;
    try {
      es = new EventSource(`${API_ENDPOINTS.nfc}/stream`);
      es.addEventListener("card_scanned", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && (payload.cardUid || payload.uid)) {
            if (nav.screen !== "nfc") {
              handleGlobalNfcScan(payload.cardUid || payload.uid);
            }
          }
        } catch (_) {}
      });
    } catch (_) {}
    return () => {
      if (es) es.close();
    };
  }, [handleGlobalNfcScan, nav.screen]);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  useEffect(() => {
    function handleClickOutsideNotif(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClickOutsideNotif);
    return () => document.removeEventListener("mousedown", handleClickOutsideNotif);
  }, [notifOpen]);

  const handleNav = (navState) => {
    if (navState.screen === "group" && (navState.levelId || navState.catId || navState.groupId)) {
      const gType = navState.groupType || "Normal";
      const cat = CAT_BY_ID[navState.catId] || SCHOOL_CATS.find(c => c.levels?.includes(navState.levelId)) || SCHOOL_CATS[0];
      const resolvedCatId = navState.catId || cat?.id || "cem";
      const resolvedLevel = navState.levelId || "";
      const langLevelObj = resolvedCatId === "langues" ? (data.langLevels || []).find(l => l.id === resolvedLevel) : null;
      const levelDisplayName = langLevelObj ? langLevelObj.nom : resolvedLevel;
      
      let existing = null;
      if (navState.groupId) {
        existing = (data.groups || []).find(s => s.id === navState.groupId);
      }
      if (!existing && resolvedLevel && resolvedCatId) {
        existing = (data.groups || []).find(s => 
          s.categoryId === resolvedCatId && 
          s.levelId === resolvedLevel && 
          (navState.groupType ? s.groupType === navState.groupType : true) &&
          (!activeYearId || !s.academicYearId || s.academicYearId === activeYearId)
        );
      }


      if (existing) {
        setNav({
          screen: "group",
          groupId: existing.id,
          catId: existing.categoryId,
          levelId: existing.levelId,
          groupType: existing.groupType,
          openAddStudent: navState.openAddStudent || false
        });
      } else {
        setNav({
          screen: "structure",
          catId: resolvedCatId,
          levelId: resolvedLevel,
          groupType: gType,
        });
      }
    } else {
      setNav(navState);
    }
  };
  
  const goBack = () => {
    if (nav.screen === "student") {
      const en = (data.enrollments || []).find(e => e.studentId === nav.studentId && e.academicYearId === activeYearId);
      if (en) setNav({ screen: "group", groupId: en.groupId });
      else setNav({ screen: "dashboard" });
    } else if (nav.screen === "group") {
      const g = (data.groups || []).find(s => s.id === nav.groupId);
      if (g && g.categoryId && g.levelId) {
        setNav({ screen: "structure", catId: g.categoryId, levelId: g.levelId });
      } else if (nav.catId && nav.levelId) {
        setNav({ screen: "structure", catId: nav.catId, levelId: nav.levelId });
      } else {
        setNav({ screen: "groups_dashboard" });
      }
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
        groupId: notif.meta.groupId
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

            <LanguageToggle />
            
            {/* Notifications Dropdown */}
            <div ref={notifRef} style={{ position: "relative" }}>
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
        {nav.screen === "dashboard" && <DashboardScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} activeYearId={activeYearId} />}
        {nav.screen === "groups_dashboard" && <SchoolStructureScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} activeYearId={activeYearId} isReadOnlyYear={isReadOnlyYear} />}
        {nav.screen === "structure" && <SchoolStructureScreen catId={nav.catId} levelId={nav.levelId} groupType={nav.groupType} data={data} setData={setData} toastFn={toastFn} onNav={handleNav} activeYearId={activeYearId} isReadOnlyYear={isReadOnlyYear} />}
        {nav.screen === "group" && (
          <GroupScreen
            groupId={nav.groupId}
            catId={nav.catId}
            levelId={nav.levelId}
            groupType={nav.groupType}
            openAddStudent={nav.openAddStudent}
            openSessionId={nav.openSessionId}
            data={data}
            setData={setData}
            toastFn={toastFn}
            onBack={goBack}
            onNav={handleNav}
            activeYearId={activeYearId}
            isReadOnlyYear={isReadOnlyYear}
          />
        )}
        {nav.screen === "student" && <StudentScreen studentId={nav.studentId} data={data} setData={setData} toastFn={toastFn} onBack={goBack} onNav={handleNav} activeYearId={activeYearId} isReadOnlyYear={isReadOnlyYear} />}
        {nav.screen === "calendar" && <CalendarScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} activeYearId={activeYearId} isReadOnlyYear={isReadOnlyYear} />}
        {nav.screen === "chat" && <CommunicationScreen data={data} setData={setData} toastFn={toastFn} initialTarget={nav} onBack={goBack} activeYearId={activeYearId} />}
        {nav.screen === "finance" && <FinancialScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} activeYearId={activeYearId} />}
        {nav.screen === "debts" && <DebtsScreen data={data} setData={setData} toastFn={toastFn} onNav={handleNav} activeYearId={activeYearId} />}
        {nav.screen === "nfc" && <NfcAttendanceScreen data={data} setData={setData} toastFn={toastFn} onBack={goBack} onNav={handleNav} />}

        {nav.screen === "parents" && <ParentsScreen data={data} setData={setData} toastFn={toastFn} openChat={(sid) => handleNav({ screen: "chat", studentId: sid, parentId: sid })} onBack={goBack} activeYearId={activeYearId} isReadOnlyYear={isReadOnlyYear} />}
        {nav.screen === "settings" && <SettingsScreen admin={data.admin} data={data} setData={setData} toastFn={toastFn} onSave={(a) => setData(d => ({ ...d, admin: a }))} onBack={goBack} />}
      </div>

      {/* ── Global NFC Auto-Attendance HUD Banner ── */}
      {nfcBanner && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: isRTL ? "auto" : 24,
            left: isRTL ? 24 : "auto",
            zIndex: 9999,
            minWidth: 320,
            maxWidth: 420,
            borderRadius: 18,
            padding: "16px 20px",
            background: nfcBanner.type === "success"
              ? "linear-gradient(135deg, rgba(16,36,28,0.97) 0%, rgba(20,55,40,0.97) 100%)"
              : nfcBanner.type === "duplicate"
              ? "linear-gradient(135deg, rgba(50,38,15,0.97) 0%, rgba(65,45,18,0.97) 100%)"
              : "linear-gradient(135deg, rgba(55,18,22,0.97) 0%, rgba(70,22,26,0.97) 100%)",
            border: `1.5px solid ${
              nfcBanner.type === "success"
                ? "rgba(74,222,128,0.6)"
                : nfcBanner.type === "duplicate"
                ? "rgba(251,191,36,0.6)"
                : "rgba(248,113,113,0.6)"
            }`,
            boxShadow: "0 20px 45px rgba(0,0,0,0.65), 0 0 25px rgba(74,222,128,0.18)",
            backdropFilter: "blur(20px)",
            color: "#fff",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: nfcBanner.type === "success"
                    ? "rgba(74,222,128,0.2)"
                    : nfcBanner.type === "duplicate"
                    ? "rgba(251,191,36,0.2)"
                    : "rgba(248,113,113,0.2)",
                  border: `1px solid ${
                    nfcBanner.type === "success"
                      ? "rgba(74,222,128,0.4)"
                      : nfcBanner.type === "duplicate"
                      ? "rgba(251,191,36,0.4)"
                      : "rgba(248,113,113,0.4)"
                  }`,
                }}
              >
                {nfcBanner.type === "success" && <CheckCircle2 size={24} color="#4ade80" />}
                {nfcBanner.type === "duplicate" && <AlertTriangle size={24} color="#fbbf24" />}
                {nfcBanner.type === "unknown" && <XCircle size={24} color="#f87171" />}
              </div>

              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: nfcBanner.type === "success" ? "#4ade80" : nfcBanner.type === "duplicate" ? "#fbbf24" : "#f87171" }}>
                  {nfcBanner.type === "success" && (lang === "ar" ? "✅ تم تسجيل الحضور تلقائياً (NFC)" : "✅ Pointage NFC Enregistré")}
                  {nfcBanner.type === "duplicate" && (lang === "ar" ? "⚠️ تسجيل مكرر تم مسبقاً" : "⚠️ Déjà Pointé")}
                  {nfcBanner.type === "unknown" && (lang === "ar" ? "❌ بطاقة غير مسجلة!" : "❌ Badge Non Reconnu")}
                </div>

                {nfcBanner.type === "success" && (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                      {nfcBanner.student?.prenom} {nfcBanner.student?.nom}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {nfcBanner.group?.nom && <span>🏷️ {nfcBanner.group.nom}</span>}
                      <span>⏱️ {nfcBanner.time}</span>
                    </div>

                    {/* Financial status pill */}
                    <div style={{ marginTop: 8 }}>
                      {(nfcBanner.financial?.totalUnpaid || 0) <= 0 ? (
                        <span style={{ fontSize: 11, background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", color: "#86efac", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                          {lang === "ar" ? "💚 الحساب مسدد بالكامل" : "💚 À jour de paiement"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, background: "rgba(248,113,113,0.2)", border: "1px solid rgba(248,113,113,0.4)", color: "#fca5a5", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                          {lang === "ar" ? `⚠️ عليه مستحقات: ${nfcBanner.financial.totalUnpaid} DA` : `⚠️ Reste dû : ${nfcBanner.financial.totalUnpaid} DA`}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {nfcBanner.type === "duplicate" && (
                  <div style={{ fontSize: 13, color: "#fff", marginTop: 4 }}>
                    {lang === "ar" 
                      ? `${nfcBanner.student?.prenom} ${nfcBanner.student?.nom} مسجل مسبقاً (انتظر ${nfcBanner.remainingSec}ث)`
                      : `${nfcBanner.student?.prenom} a déjà été pointé (patienter ${nfcBanner.remainingSec}s)`}
                  </div>
                )}

                {nfcBanner.type === "unknown" && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 12.5, color: "#fff" }}>
                      {lang === "ar" ? `الرمز: ${nfcBanner.cleanUid}` : `UID: ${nfcBanner.cleanUid}`}
                    </div>
                    <button
                      onClick={() => {
                        setNfcBanner(null);
                        setNav({ screen: "nfc" });
                      }}
                      style={{
                        marginTop: 6, padding: "5px 10px", borderRadius: 8,
                        background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                        color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      {lang === "ar" ? "ربط البطاقة بتلميذ ←" : "Associer la carte ←"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setNfcBanner(null)}
              style={{
                background: "transparent", border: "none", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", padding: 2, display: "flex", alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
