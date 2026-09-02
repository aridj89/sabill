import React, { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { C, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import { notifyAdminParentMessage } from "../../utils/notificationEngine";

export default function ChatScreen({ data, setData, role, parentId, activeParentId, setActiveParentId, onBack }) {
  const { t, isRTL } = useLanguage();
  const [text, setText] = useState("");
  const scrollRef = useRef(null);
  const targetId = role === "admin" ? activeParentId : parentId;
  const parent = data.parents.find(p => p.id === targetId);
  const thread = data.messages.filter(m => m.parentId === targetId);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [thread.length, targetId]);

  const send = () => {
    if (!text.trim() || !targetId) return;
    const messageText = text.trim();
    const msg = { id: uid(), parentId: targetId, sender: role, text: messageText, ts: Date.now() };
    
    setData(d => {
      let notifs = d.userNotifications || [];
      if (role === "parent") {
        const pName = parent ? parent.nom : "Un parent";
        notifs = notifyAdminParentMessage(d, targetId, pName, messageText);
      }
      return {
        ...d,
        messages: [...d.messages, msg],
        userNotifications: notifs,
      };
    });
    setText("");
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 160px)", minHeight: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
      {role === "admin" && (
        <div style={{ width: 220, borderRight: isRTL ? "none" : `1px solid ${C.border}`, borderLeft: isRTL ? `1px solid ${C.border}` : "none", overflowY: "auto" }}>
          {data.parents.map(p => (
            <button key={p.id} onClick={() => setActiveParentId(p.id)} style={{
              display: "block", width: "100%", textAlign: isRTL ? "right" : "left", padding: "13px 14px", border: "none",
              background: activeParentId === p.id ? C.navySoft : "transparent", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{p.nom}</div>
              <div style={{ fontSize: 11.5, color: C.inkSoft }}>{p.telephone}</div>
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{role === "admin" ? (parent ? `${isRTL ? "محادثة مع" : "Discussion avec"} ${parent.nom}` : t("noConversationSelected")) : (isRTL ? "محادثة مع إدارة المؤسسة" : "Discussion avec l'administration")}</span>
          {onBack && (
            <button
              onClick={onBack}
              title={t("close")}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {thread.map(m => (
            <div key={m.id} style={{
              alignSelf: m.sender === role ? (isRTL ? "flex-start" : "flex-end") : (isRTL ? "flex-end" : "flex-start"), maxWidth: "72%",
              background: m.sender === role ? C.navy : "rgba(255,255,255,0.1)", color: "#fff",
              padding: "9px 13px", borderRadius: 14, fontSize: 13.5,
              border: `1px solid ${m.sender === role ? "rgba(226,150,58,0.4)" : "rgba(255,255,255,0.15)"}`,
            }}>{m.text}</div>
          ))}
          {thread.length === 0 && <p style={{ color: C.inkSoft, fontSize: 13.5, textAlign: "center", margin: "auto" }}>{t("noMessagesYet")}</p>}
        </div>
        {(role === "parent" || parent) && (
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${C.border}` }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder={t("typeMessagePlaceholder")} value={text}
              onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
            <button onClick={send} style={{ background: C.accent, border: "none", borderRadius: 12, width: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={17} color="#fff" style={{ transform: isRTL ? "scaleX(-1)" : "none" }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
