import React, { useState } from "react";
import { Send, Users, User, MessageSquare } from "lucide-react";
import { C, uid, inputStyle } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import { notifyAdminPrivateMessage, notifyAdminSubgroupMessage } from "../../utils/notificationEngine";

export default function StudentChat({ student, subgroup, data, setData }) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState("group"); // 'group' | 'private'
  const [text, setText] = useState("");

  if (!subgroup) {
    return <div style={{ color: C.inkSoft }}>{lang === "ar" ? "أنت غير مسجل في أي فوج" : "Vous n'êtes inscrit dans aucun groupe."}</div>;
  }

  // Messages de groupe
  const groupMessages = (data.subgroupMessages || [])
    .filter(m => m.subgroupId === subgroup.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Messages privés avec l'admin
  const privateMessages = (data.privateMessages || [])
    .filter(m => m.studentId === student.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const handleSend = () => {
    if (!text.trim()) return;

    const messageContent = text.trim();
    const studentFullName = `${student.prenom} ${student.nom}`;

    const msgObj = {
      id: uid(),
      senderId: student.id,
      senderRole: "student",
      senderName: studentFullName,
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    if (tab === "group") {
      msgObj.subgroupId = subgroup.id;
      setData(d => {
        const notifs = notifyAdminSubgroupMessage(d, subgroup.id, subgroup.nom, studentFullName, messageContent);
        return {
          ...d,
          subgroupMessages: [...(d.subgroupMessages || []), msgObj],
          userNotifications: notifs,
        };
      });
    } else {
      msgObj.studentId = student.id;
      setData(d => {
        const notifs = notifyAdminPrivateMessage(d, student.id, studentFullName, messageContent);
        return {
          ...d,
          privateMessages: [...(d.privateMessages || []), msgObj],
          userNotifications: notifs,
        };
      });
    }

    setText("");
  };

  return (
    <div>
      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setTab("group")}
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: `1.5px solid ${tab === "group" ? C.accent : "rgba(255,255,255,0.15)"}`,
            background: tab === "group" ? "rgba(226,150,58,0.15)" : "rgba(255,255,255,0.05)",
            color: tab === "group" ? C.accent : C.inkSoft,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.15s",
          }}
        >
          <Users size={18} />
          {lang === "ar" ? "مجموعة الفوج (" + subgroup.nom + ")" : "Groupe (" + subgroup.nom + ")"}
        </button>

        <button
          onClick={() => setTab("private")}
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: `1.5px solid ${tab === "private" ? C.accent : "rgba(255,255,255,0.15)"}`,
            background: tab === "private" ? "rgba(226,150,58,0.15)" : "rgba(255,255,255,0.05)",
            color: tab === "private" ? C.accent : C.inkSoft,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.15s",
          }}
        >
          <User size={18} />
          {lang === "ar" ? "المحادثة الخاصة مع الأستاذ" : "Discussion privée avec le Prof"}
        </button>
      </div>

      {/* ── Chat Container ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, height: 480, display: "flex", flexDirection: "column" }}>
        
        {/* Messages List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 6 }}>
          {tab === "group" ? (
            groupMessages.length === 0 ? (
              <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                {lang === "ar" ? "لا توجد رسائل في الفوج بعد" : "Aucun message dans le groupe."}
              </div>
            ) : (
              groupMessages.map(m => {
                const isMe = m.senderId === student.id;
                const isAdmin = m.senderRole === "admin";
                return (
                  <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                    {!isMe && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? C.accent : "#818cf8", marginBottom: 3 }}>
                        {isAdmin ? (lang === "ar" ? "الأستاذ" : "Professeur") : m.senderName}
                      </div>
                    )}
                    <div style={{
                      padding: "10px 14px", borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      background: isMe ? C.accent : isAdmin ? "rgba(226,150,58,0.2)" : "rgba(255,255,255,0.08)",
                      border: `1px solid ${isMe ? C.accent : isAdmin ? "rgba(226,150,58,0.4)" : C.border}`,
                      color: isMe ? "#120e2e" : "#fff", fontSize: 14, fontWeight: isMe ? 600 : 400
                    }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 2, textAlign: isMe ? "right" : "left" }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            privateMessages.length === 0 ? (
              <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                {lang === "ar" ? "ابدأ المحادثة الخاصة مع الأستاذ" : "Envoyez un message privé à votre professeur."}
              </div>
            ) : (
              privateMessages.map(m => {
                const isMe = m.senderId === student.id;
                return (
                  <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                    <div style={{
                      padding: "10px 14px", borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      background: isMe ? C.accent : "rgba(255,255,255,0.08)",
                      border: `1px solid ${isMe ? C.accent : C.border}`,
                      color: isMe ? "#120e2e" : "#fff", fontSize: 14, fontWeight: isMe ? 600 : 400
                    }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 2, textAlign: isMe ? "right" : "left" }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Input Bar */}
        <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder={lang === "ar" ? "اكتب رسالتك هنا…" : "Écrivez votre message…"}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            style={{
              padding: "0 18px", borderRadius: 12, background: C.accent, border: "none",
              color: "#120e2e", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
