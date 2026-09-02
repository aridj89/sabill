import React, { useState, useRef, useEffect } from "react";
import { Menu, Search, CalendarClock, Users, MessageCircle, LogOut, Settings, ChevronDown } from "lucide-react";
import { C, inputStyle, NIVEAU_ICON } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import IconBtn from "../../components/ui/IconBtn";
import AvatarDisplay from "../../components/ui/AvatarDisplay";
import LanguageToggle from "../../components/ui/LanguageToggle";
import Sidebar from "../../components/Sidebar";
import GroupsDashboard from "./GroupsDashboard";
import ParentsScreen from "./ParentsScreen";
import ChatScreen from "./ChatScreen";
import SettingsScreen from "./SettingsScreen";
import AddSessionModal from "./AddSessionModal";

export default function AdminApp({ data, setData, onLogout, toastFn }) {
  const { t, isRTL } = useLanguage();
  const [screen, setScreen] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [activeParentId, setActiveParentId] = useState(data.parents[0]?.id || null);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const searchResults = search.trim() ? data.students.filter(s => `${s.prenom} ${s.nom}`.toLowerCase().includes(search.toLowerCase())) : [];
  const unread = 0;
  const CurrentNiveauIcon = filter ? NIVEAU_ICON[filter.niveau] : null;

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

  return (
    <div className="f-body" style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 40, ...C.glassStyle, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none", padding: "12px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <IconBtn icon={Menu} onClick={() => setSidebarOpen(true)} title={t("categories")} />
          {filter && CurrentNiveauIcon && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.navySoft, padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, color: C.navy, border: "1px solid rgba(226,150,58,0.3)" }}>
              <CurrentNiveauIcon size={14} /> {getNiveauLabel(filter.niveau)} · {filter.annee} · {getTypeLabel(filter.type)}
            </div>
          )}
          <div style={{ position: "relative", flex: 1, maxWidth: 320, marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0, height: 40, display: "flex", alignItems: "center" }}>
            <Search size={16} color={C.inkSoft} style={{ position: "absolute", left: isRTL ? "auto" : 12, right: isRTL ? 12 : "auto", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("searchStudentPlaceholder")}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                fontSize: 13.5,
                color: C.ink,
                outline: "none",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(4px)",
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: isRTL ? 12 : 36,
                paddingRight: isRTL ? 36 : 12,
              }}
            />
            {searchResults.length > 0 && (
              <div style={{ position: "absolute", top: 46, left: 0, right: 0, ...C.glassStyle, borderRadius: 14, zIndex: 50, overflow: "hidden", boxShadow: "0 18px 40px rgba(0,0,0,0.5)" }}>
                {searchResults.map(s => {
                  const g = data.groups.find(gr => gr.id === s.groupId);
                  return (
                    <button key={s.id} onClick={() => { setFilter(g ? { niveau: g.niveau, annee: g.annee, type: g.type } : null); setScreen("dashboard"); setSearch(""); }}
                      style={{ display: "block", width: "100%", textAlign: isRTL ? "right" : "left", padding: "10px 14px", border: "none", background: "transparent", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{s.prenom} {s.nom}</div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft }}>{g ? `${g.nom} · ${getNiveauLabel(g.niveau)} ${g.annee}` : ""}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <IconBtn icon={Settings} onClick={() => setScreen("settings")} active={screen === "settings"} title={t("settingsNav")} />
          <div style={{ display: "flex", gap: 8, marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0, alignItems: "center" }}>
            <LanguageToggle />
            <IconBtn icon={CalendarClock} onClick={() => setShowAddSession(true)} title={t("addSessionBtn")} />
            <IconBtn icon={Users} onClick={() => setScreen("parents")} active={screen === "parents"} title={t("parentsList")} />
            <IconBtn icon={MessageCircle} onClick={() => setScreen("chat")} active={screen === "chat"} badge={unread} title={t("messagesNav")} />

            {/* ── Profile Dropdown ── */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                title={t("settingsNav")}
                style={{
                  height: 40,
                  display: "flex", alignItems: "center", gap: 8,
                  padding: isRTL ? "0 8px 0 12px" : "0 12px 0 8px",
                  border: profileOpen || screen === "settings"
                    ? "1.5px solid rgba(226,150,58,0.8)"
                    : "1px solid rgba(255,255,255,0.22)",
                  background: profileOpen || screen === "settings"
                    ? "linear-gradient(135deg,rgba(226,150,58,0.35),rgba(226,150,58,0.15))"
                    : "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderRadius: 12,
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all .18s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <AvatarDisplay avatar={data.admin.avatar} size={26} style={{ border: "none", boxShadow: "none", background: "transparent" }} />
                <div style={{ textAlign: isRTL ? "right" : "left", lineHeight: 1.15 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
                    {data.admin.prenom} {data.admin.nom}
                  </div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)" }}>
                    @{data.admin.username}
                  </div>
                </div>
                <ChevronDown
                  size={13}
                  color="rgba(255,255,255,0.6)"
                  style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                />
              </button>

              {/* Dropdown panel */}
              {profileOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto",
                  width: 220,
                  background: "linear-gradient(160deg, rgba(22,18,71,0.96) 0%, rgba(71,48,18,0.92) 55%, rgba(18,68,71,0.96) 100%)",
                  backdropFilter: "blur(24px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  overflow: "hidden",
                  zIndex: 200,
                  animation: "dropIn .2s cubic-bezier(.22,1,.36,1)",
                }}>
                  {/* Header */}
                  <div style={{
                    padding: "18px 16px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <AvatarDisplay avatar={data.admin.avatar} size={46} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>
                        {data.admin.prenom} {data.admin.nom}
                      </div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                        @{data.admin.username}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: "8px 8px" }}>
                    <button
                      onClick={() => { setScreen("settings"); setProfileOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 12, border: "none",
                        background: screen === "settings" ? "rgba(226,150,58,0.18)" : "transparent",
                        color: "rgba(255,255,255,0.88)", fontSize: 13.5, fontWeight: 600,
                        cursor: "pointer", transition: "background .15s",
                        textAlign: isRTL ? "right" : "left",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                      onMouseLeave={e => e.currentTarget.style.background = screen === "settings" ? "rgba(226,150,58,0.18)" : "transparent"}
                    >
                      <Settings size={15} color="rgba(226,150,58,0.85)" />
                      {t("settingsNav")}
                    </button>

                    <button
                      onClick={() => { setProfileOpen(false); onLogout(); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 12, border: "none",
                        background: "transparent",
                        color: "rgba(248,113,113,0.9)", fontSize: 13.5, fontWeight: 600,
                        cursor: "pointer", transition: "background .15s",
                        textAlign: isRTL ? "right" : "left",
                        marginTop: 2,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <LogOut size={15} color="rgba(248,113,113,0.85)" />
                      {t("logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeFilter={filter} onSelect={(f) => { setFilter(f); setScreen("dashboard"); }} onNavigateChat={() => setScreen("chat")} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
        {screen === "dashboard" && <GroupsDashboard data={data} setData={setData} filter={filter} setFilter={setFilter} toastFn={toastFn} />}
        {screen === "parents" && <ParentsScreen data={data} setData={setData} toastFn={toastFn} openChat={(pid) => { setActiveParentId(pid); setScreen("chat"); }} onBack={() => setScreen("dashboard")} />}
        {screen === "chat" && <ChatScreen data={data} setData={setData} role="admin" activeParentId={activeParentId} setActiveParentId={setActiveParentId} onBack={() => setScreen("dashboard")} />}
        {screen === "settings" && <SettingsScreen admin={data.admin} toastFn={toastFn} onSave={(a) => setData(d => ({ ...d, admin: a }))} onBack={() => setScreen("dashboard")} />}
      </div>

      {showAddSession && (
        <AddSessionModal onClose={() => setShowAddSession(false)} onAdd={(s) => {
          setData(d => ({ ...d, extraSessions: [...d.extraSessions, s] }));
          toastFn(t("extraSessionAdded"));
        }} />
      )}
    </div>
  );
}
