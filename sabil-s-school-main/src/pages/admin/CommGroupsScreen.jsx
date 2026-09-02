import React, { useState, useRef, useEffect } from "react";
import { Send, Plus, Trash2, X, Users, MessageSquare, ChevronDown, ChevronRight, FolderOpen, Folder, BookOpen } from "lucide-react";
import { C, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import { notifyAdminCommGroupMessage } from "../../utils/notificationEngine";

// ─── Category accent colors ────────────────────────────────────────────────
const CAT_COLORS = [
  { bg: "rgba(99,102,241,0.25)", border: "rgba(99,102,241,0.6)", text: "#a5b4fc" },   // indigo
  { bg: "rgba(34,197,94,0.2)",   border: "rgba(34,197,94,0.5)",  text: "#86efac" },   // green
  { bg: "rgba(236,72,153,0.2)",  border: "rgba(236,72,153,0.5)", text: "#f9a8d4" },   // pink
  { bg: "rgba(234,179,8,0.2)",   border: "rgba(234,179,8,0.5)",  text: "#fde047" },   // yellow
  { bg: "rgba(20,184,166,0.2)",  border: "rgba(20,184,166,0.5)", text: "#5eead4" },   // teal
  { bg: "rgba(249,115,22,0.2)",  border: "rgba(249,115,22,0.5)", text: "#fdba74" },   // orange
];

function getCatColor(idx) { return CAT_COLORS[idx % CAT_COLORS.length]; }

// ─── Modal helper ─────────────────────────────────────────────────────────
function Modal({ onClose, children }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: 360,
        background: "linear-gradient(160deg,rgba(22,18,71,0.98) 0%,rgba(71,48,18,0.96) 55%,rgba(18,68,71,0.98) 100%)",
        backdropFilter: "blur(28px)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 22,
        padding: "26px 24px",
        boxShadow: "0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function CommGroupsScreen({ data, setData, role, toastFn, onBack }) {
  const { t } = useLanguage();

  const commCategories = data.commCategories || [];
  const commGroups     = data.commGroups     || [];
  const commMessages   = data.commMessages   || [];

  // active selections
  const [activeCatId,   setActiveCatId]   = useState(commCategories[0]?.id || null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [openCats,      setOpenCats]      = useState(() => {
    const init = {};
    commCategories.forEach(c => { init[c.id] = true; });
    return init;
  });

  // text input
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  // modals
  const [showAddCat,    setShowAddCat]    = useState(false);
  const [showAddGroup,  setShowAddGroup]  = useState(false);  // { catId }
  const [addGroupCatId, setAddGroupCatId] = useState(null);
  const [deleteCatId,   setDeleteCatId]   = useState(null);
  const [deleteGroupId, setDeleteGroupId] = useState(null);

  // form fields
  const [catName,   setCatName]   = useState("");
  const [groupName, setGroupName] = useState("");

  const activeGroup = commGroups.find(g => g.id === activeGroupId);
  const thread      = commMessages.filter(m => m.groupId === activeGroupId);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [thread.length, activeGroupId]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleCat = (id) => setOpenCats(p => ({ ...p, [id]: !p[id] }));

  const selectGroup = (gid) => {
    setActiveGroupId(gid);
    setText("");
  };

  const send = () => {
    if (!text.trim() || !activeGroupId) return;
    const messageText = text.trim();
    const senderLabel = role === "admin" ? t("admin") : t("parent");
    const msg = {
      id: uid(),
      groupId: activeGroupId,
      sender: role,
      senderLabel: senderLabel,
      text: messageText,
      ts: Date.now(),
    };
    
    setData(d => {
      let notifs = d.userNotifications || [];
      if (role !== "admin") {
        notifs = notifyAdminCommGroupMessage(d, activeGroupId, activeGroup?.nom, senderLabel, messageText);
      }
      return {
        ...d,
        commMessages: [...(d.commMessages || []), msg],
        userNotifications: notifs,
      };
    });
    setText("");
  };

  // ── Admin actions ─────────────────────────────────────────────────────────
  const addCategory = () => {
    if (!catName.trim()) return;
    const newCat = { id: uid(), nom: catName.trim() };
    setData(d => ({ ...d, commCategories: [...(d.commCategories || []), newCat] }));
    setOpenCats(p => ({ ...p, [newCat.id]: true }));
    setCatName("");
    setShowAddCat(false);
    if (toastFn) toastFn(t("commCatCreated"));
  };

  const deleteCategory = (id) => {
    const groupsInCat = commGroups.filter(g => g.categoryId === id).map(g => g.id);
    setData(d => ({
      ...d,
      commCategories: (d.commCategories || []).filter(c => c.id !== id),
      commGroups:     (d.commGroups     || []).filter(g => g.categoryId !== id),
      commMessages:   (d.commMessages   || []).filter(m => !groupsInCat.includes(m.groupId)),
    }));
    if (groupsInCat.includes(activeGroupId)) setActiveGroupId(null);
    setDeleteCatId(null);
    if (toastFn) toastFn(t("commCatDeleted"));
  };

  const addGroup = () => {
    if (!groupName.trim() || !addGroupCatId) return;
    const newGroup = { id: uid(), nom: groupName.trim(), categoryId: addGroupCatId };
    setData(d => ({ ...d, commGroups: [...(d.commGroups || []), newGroup] }));
    setActiveGroupId(newGroup.id);
    setGroupName("");
    setShowAddGroup(false);
    setAddGroupCatId(null);
    if (toastFn) toastFn(t("commGroupCreated"));
  };

  const deleteGroup = (id) => {
    setData(d => ({
      ...d,
      commGroups:   (d.commGroups   || []).filter(g => g.id !== id),
      commMessages: (d.commMessages || []).filter(m => m.groupId !== id),
    }));
    if (activeGroupId === id) setActiveGroupId(null);
    setDeleteGroupId(null);
    if (toastFn) toastFn(t("commGroupDeleted"));
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "calc(100vh - 160px)", minHeight: 480, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>

      {/* ══════════════════════════════════════════════════════════════
          LEFT SIDEBAR  ──  Categories & Groups
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ width: 260, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.18)", flexShrink: 0 }}>

        {/* Sidebar header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} color={C.accent} />
            {t("commGroupsTitle")}
          </div>
          {role === "admin" && (
            <button
              onClick={() => setShowAddCat(true)}
              title={t("addCommCategory")}
              style={{
                width: 26, height: 26, borderRadius: 7,
                border: `1px solid rgba(226,150,58,0.45)`,
                background: "rgba(226,150,58,0.12)",
                color: C.accent, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(226,150,58,0.28)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(226,150,58,0.12)"}
            >
              <Plus size={13} />
            </button>
          )}
        </div>

        {/* Category + group tree */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {commCategories.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <FolderOpen size={32} color={C.inkSoft} style={{ opacity: 0.35, marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: C.inkSoft }}>{t("noCommCategories")}</div>
              {role === "admin" && <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4, opacity: 0.6 }}>{t("noCommCategoriesSubtitle")}</div>}
            </div>
          ) : (
            commCategories.map((cat, catIdx) => {
              const color      = getCatColor(catIdx);
              const isOpen     = !!openCats[cat.id];
              const groupsHere = commGroups.filter(g => g.categoryId === cat.id);

              return (
                <div key={cat.id} style={{ marginBottom: 2 }}>
                  {/* Category row */}
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "8px 10px 8px 12px",
                      cursor: "pointer",
                      borderRadius: 0,
                      userSelect: "none",
                    }}
                    onClick={() => toggleCat(cat.id)}
                  >
                    {/* Chevron */}
                    {isOpen
                      ? <ChevronDown size={13} color={color.text} />
                      : <ChevronRight size={13} color={color.text} />
                    }

                    {/* Icon */}
                    <div style={{
                      width: 26, height: 26, borderRadius: 7,
                      background: color.bg, border: `1px solid ${color.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <BookOpen size={13} color={color.text} />
                    </div>

                    {/* Name */}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cat.nom}
                    </span>

                    {/* Count badge */}
                    <span style={{ fontSize: 10, fontWeight: 700, color: color.text, background: color.bg, border: `1px solid ${color.border}`, borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>
                      {groupsHere.length}
                    </span>

                    {/* Admin buttons */}
                    {role === "admin" && (
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {/* Add group to this category */}
                        <button
                          onClick={() => { setAddGroupCatId(cat.id); setShowAddGroup(true); }}
                          title={t("addCommGroup")}
                          style={{
                            width: 20, height: 20, borderRadius: 5, border: "none",
                            background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all 0.12s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = color.bg; e.currentTarget.style.color = color.text; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                        >
                          <Plus size={11} />
                        </button>
                        {/* Delete category */}
                        <button
                          onClick={() => setDeleteCatId(cat.id)}
                          title={t("delete")}
                          style={{
                            width: 20, height: 20, borderRadius: 5, border: "none",
                            background: "rgba(255,255,255,0.08)", color: "rgba(248,113,113,0.45)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all 0.12s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; e.currentTarget.style.color = "#f87171"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(248,113,113,0.45)"; }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Groups under category */}
                  {isOpen && (
                    <div style={{ paddingLeft: 28, paddingRight: 6, paddingBottom: 4 }}>
                      {groupsHere.length === 0 ? (
                        <div style={{ fontSize: 11, color: C.inkSoft, padding: "6px 8px", fontStyle: "italic", opacity: 0.6 }}>
                          {t("noGroupsInCategory")}
                        </div>
                      ) : (
                        groupsHere.map(g => {
                          const msgs    = commMessages.filter(m => m.groupId === g.id);
                          const lastMsg = msgs[msgs.length - 1];
                          const isActive = activeGroupId === g.id;

                          return (
                            <div
                              key={g.id}
                              onClick={() => selectGroup(g.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "7px 8px",
                                borderRadius: 10,
                                marginBottom: 2,
                                background: isActive
                                  ? `linear-gradient(135deg, ${color.bg}, rgba(226,150,58,0.12))`
                                  : "transparent",
                                border: isActive ? `1px solid ${color.border}` : "1px solid transparent",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                            >
                              {/* Group avatar */}
                              <div style={{
                                width: 32, height: 32, borderRadius: 9,
                                background: isActive ? color.bg : "rgba(255,255,255,0.07)",
                                border: `1px solid ${isActive ? color.border : "rgba(255,255,255,0.12)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 800, fontSize: 11.5,
                                color: isActive ? color.text : "rgba(255,255,255,0.65)",
                                flexShrink: 0, letterSpacing: "-0.5px",
                              }}>
                                {g.nom.slice(0, 2).toUpperCase()}
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#fff" : "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {g.nom}
                                </div>
                                {lastMsg
                                  ? <div style={{ fontSize: 10.5, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lastMsg.text}</div>
                                  : <div style={{ fontSize: 10.5, color: C.inkSoft, opacity: 0.45, fontStyle: "italic" }}>ابدأ المحادثة…</div>
                                }
                              </div>

                              {/* Delete group (admin) */}
                              {role === "admin" && (
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteGroupId(g.id); }}
                                  title={t("delete")}
                                  style={{
                                    width: 20, height: 20, borderRadius: 5, border: "none",
                                    background: "transparent", color: "rgba(248,113,113,0.4)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", flexShrink: 0, transition: "all 0.12s",
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; e.currentTarget.style.color = "#f87171"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(248,113,113,0.4)"; }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL  ──  Chat area
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Chat header */}
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeGroup ? (() => {
              const catIdx  = commCategories.findIndex(c => c.id === activeGroup.categoryId);
              const color   = getCatColor(catIdx >= 0 ? catIdx : 0);
              const cat     = commCategories.find(c => c.id === activeGroup.categoryId);
              return (
                <>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: color.bg, border: `1.5px solid ${color.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 13.5, color: color.text, letterSpacing: "-0.5px",
                  }}>
                    {activeGroup.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{activeGroup.nom}</div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft }}>{cat ? cat.nom : ""} · {thread.length} رسالة</div>
                  </div>
                </>
              );
            })() : (
              <span style={{ color: C.inkSoft, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={18} color={C.inkSoft} style={{ opacity: 0.4 }} />
                {t("selectCommGroup")}
              </span>
            )}
          </div>

          {onBack && (
            <button onClick={onBack} title={t("close")} style={{
              width: 32, height: 32, borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0, transition: "all 0.15s ease",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          {!activeGroup ? (
            <div style={{ margin: "auto", textAlign: "center", opacity: 0.6 }}>
              <MessageSquare size={52} color={C.inkSoft} style={{ opacity: 0.25, marginBottom: 14 }} />
              <p style={{ color: C.inkSoft, fontSize: 14 }}>{t("selectCommGroup")}</p>
            </div>
          ) : thread.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", opacity: 0.7 }}>
              <MessageSquare size={44} color={C.inkSoft} style={{ opacity: 0.25, marginBottom: 12 }} />
              <p style={{ color: C.inkSoft, fontSize: 13.5 }}>{t("noMessagesYet")}</p>
            </div>
          ) : (
            thread.map(m => {
              const isMine = m.sender === role;
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 3 }}>
                  {!isMine && (
                    <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, paddingLeft: 4 }}>
                      {m.senderLabel}
                    </div>
                  )}
                  <div style={{
                    maxWidth: "70%",
                    background: isMine ? C.navy : "rgba(255,255,255,0.1)",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: isMine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    fontSize: 13.5, lineHeight: 1.5,
                    border: `1px solid ${isMine ? "rgba(226,150,58,0.35)" : "rgba(255,255,255,0.13)"}`,
                    boxShadow: isMine ? "0 3px 10px rgba(0,0,0,0.22)" : "none",
                  }}>
                    {m.text}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.inkSoft, paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
                    {formatTime(m.ts)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input bar */}
        {activeGroup && (
          <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder={t("typeMessagePlaceholder")}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button onClick={send} style={{
              background: text.trim() ? C.accent : "rgba(226,150,58,0.25)",
              border: "none", borderRadius: 12, width: 46, height: 46,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: text.trim() ? "pointer" : "default",
              transition: "all 0.2s ease", boxShadow: text.trim() ? "0 4px 14px rgba(226,150,58,0.3)" : "none",
            }}>
              <Send size={18} color="#fff" />
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}

      {/* ── Add Category ── */}
      {showAddCat && (
        <Modal onClose={() => setShowAddCat(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", display: "flex", alignItems: "center", gap: 9 }}>
              <FolderOpen size={18} color={C.accent} /> {t("addCommCategory")}
            </div>
            <button onClick={() => setShowAddCat(false)} style={{ border: "none", background: "rgba(255,255,255,0.1)", borderRadius: 8, width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={14} />
            </button>
          </div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            {t("commCategoryNameLabel")}
          </label>
          <input
            autoFocus
            value={catName}
            onChange={e => setCatName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            placeholder={t("commCategoryNamePlaceholder")}
            style={{ ...inputStyle, width: "100%", marginBottom: 18, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowAddCat(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {t("cancel")}
            </button>
            <button
              onClick={addCategory}
              disabled={!catName.trim()}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                background: catName.trim() ? `linear-gradient(135deg,${C.accent},rgba(226,150,58,0.7))` : "rgba(226,150,58,0.2)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: catName.trim() ? "pointer" : "default",
                boxShadow: catName.trim() ? "0 4px 16px rgba(226,150,58,0.35)" : "none", transition: "all 0.2s",
              }}
            >
              {t("save")}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Add Group ── */}
      {showAddGroup && (
        <Modal onClose={() => { setShowAddGroup(false); setAddGroupCatId(null); }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", display: "flex", alignItems: "center", gap: 9 }}>
              <Plus size={18} color={C.accent} /> {t("addCommGroup")}
            </div>
            <button onClick={() => { setShowAddGroup(false); setAddGroupCatId(null); }} style={{ border: "none", background: "rgba(255,255,255,0.1)", borderRadius: 8, width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={14} />
            </button>
          </div>
          {/* Category badge */}
          {addGroupCatId && (() => {
            const cat    = commCategories.find(c => c.id === addGroupCatId);
            const catIdx = commCategories.findIndex(c => c.id === addGroupCatId);
            const color  = getCatColor(catIdx);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, padding: "7px 12px", borderRadius: 10, background: color.bg, border: `1px solid ${color.border}` }}>
                <BookOpen size={13} color={color.text} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: color.text }}>{cat?.nom}</span>
              </div>
            );
          })()}
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            {t("commGroupNameLabel")}
          </label>
          <input
            autoFocus
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addGroup()}
            placeholder={t("commGroupNamePlaceholder")}
            style={{ ...inputStyle, width: "100%", marginBottom: 18, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowAddGroup(false); setAddGroupCatId(null); }} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {t("cancel")}
            </button>
            <button
              onClick={addGroup}
              disabled={!groupName.trim()}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                background: groupName.trim() ? `linear-gradient(135deg,${C.accent},rgba(226,150,58,0.7))` : "rgba(226,150,58,0.2)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: groupName.trim() ? "pointer" : "default",
                boxShadow: groupName.trim() ? "0 4px 16px rgba(226,150,58,0.35)" : "none", transition: "all 0.2s",
              }}
            >
              {t("save")}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Category confirm ── */}
      {deleteCatId && (
        <Modal onClose={() => setDeleteCatId(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={24} color="#f87171" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15.5, color: "#fff", marginBottom: 8 }}>{t("delete")}</div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 22 }}>{t("deleteCommCategoryConfirm")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteCatId(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button onClick={() => deleteCategory(deleteCatId)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}>
                {t("delete")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Group confirm ── */}
      {deleteGroupId && (
        <Modal onClose={() => setDeleteGroupId(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={24} color="#f87171" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15.5, color: "#fff", marginBottom: 8 }}>{t("delete")}</div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 22 }}>{t("deleteCommGroupConfirm")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteGroupId(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button onClick={() => deleteGroup(deleteGroupId)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}>
                {t("delete")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
