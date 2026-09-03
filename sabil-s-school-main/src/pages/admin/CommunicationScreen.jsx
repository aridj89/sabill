import React, { useState, useEffect, useRef } from "react";
import { Users, User, Send, Filter, Search, ArrowLeft } from "lucide-react";
import { C, uid, inputStyle, SCHOOL_CATS, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import { notifyGroupMessage, notifyStudentPrivateMessage } from "../../utils/notificationEngine";

export default function CommunicationScreen({ data, setData, initialTarget, onBack }) {
  const { lang, isRTL } = useLanguage();
  
  // Tab: 'groups' | 'private'
  const [section, setSection] = useState(initialTarget?.studentId ? "private" : "groups");
  
  // Selection
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(initialTarget?.subgroupId || data.subgroups[0]?.id || null);
  const [selectedStudentId, setSelectedStudentId]   = useState(initialTarget?.studentId || data.students[0]?.id || null);

  useEffect(() => {
    if (initialTarget?.studentId) {
      setSection("private");
      setSelectedStudentId(initialTarget.studentId);
    } else if (initialTarget?.subgroupId) {
      setSection("groups");
      setSelectedSubgroupId(initialTarget.subgroupId);
    }
  }, [initialTarget?.studentId, initialTarget?.subgroupId]);

  // Filters for subgroups
  const [catFilter, setCatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [text, setText] = useState("");

  // Subgroups list filtered
  const filteredSubgroups = (data.subgroups || []).filter(sg => {
    if (catFilter !== "all" && sg.categoryId !== catFilter) return false;
    if (searchQuery.trim()) {
      return sg.nom.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Students list filtered
  const filteredStudents = (data.students || []).filter(st => {
    const name = `${st.prenom} ${st.nom}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || st.phone.includes(searchQuery);
  });

  const activeSubgroup = data.subgroups.find(s => s.id === selectedSubgroupId);
  const activeStudent  = data.students.find(s => s.id === selectedStudentId);

  // Messages
  const groupMessages = (data.subgroupMessages || [])
    .filter(m => m.subgroupId === selectedSubgroupId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const privateMessages = (data.privateMessages || [])
    .filter(m => m.studentId === selectedStudentId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const handleSend = () => {
    if (!text.trim()) return;

    const msgObj = {
      id: uid(),
      senderId: "admin",
      senderRole: "admin",
      senderName: `${data.admin.prenom} ${data.admin.nom}`,
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    if (section === "groups") {
      if (!selectedSubgroupId) return;
      msgObj.subgroupId = selectedSubgroupId;
      
      setData(d => {
        const notifs = notifyGroupMessage(d, selectedSubgroupId);
        return {
          ...d,
          subgroupMessages: [...(d.subgroupMessages || []), msgObj],
          userNotifications: notifs,
        };
      });
    } else {
      if (!selectedStudentId) return;
      msgObj.studentId = selectedStudentId;

      setData(d => {
        const notifs = notifyStudentPrivateMessage(d, selectedStudentId);
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
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>
            {lang === "ar" ? "مركز التواصل" : "Espace Communication"}
          </h2>
          <p style={{ color: C.inkSoft, fontSize: 13, margin: "4px 0 0" }}>
            {lang === "ar" ? "التواصل مع المجموعات والتلاميذ بشكل مباشر" : "Échangez directement avec vos groupes et vos élèves"}
          </p>
        </div>
      </div>

      {/* ── Section switch ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setSection("groups")}
          style={{
            padding: "10px 20px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: `1.5px solid ${section === "groups" ? C.accent : "rgba(255,255,255,0.15)"}`,
            background: section === "groups" ? "rgba(226,150,58,0.15)" : "rgba(255,255,255,0.05)",
            color: section === "groups" ? C.accent : C.inkSoft,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s"
          }}
        >
          <Users size={18} />
          {lang === "ar" ? "مجموعات الأفواج" : "Discussions de Groupe"}
        </button>

        <button
          onClick={() => setSection("private")}
          style={{
            padding: "10px 20px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: `1.5px solid ${section === "private" ? C.accent : "rgba(255,255,255,0.15)"}`,
            background: section === "private" ? "rgba(226,150,58,0.15)" : "rgba(255,255,255,0.05)",
            color: section === "private" ? C.accent : C.inkSoft,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s"
          }}
        >
          <User size={18} />
          {lang === "ar" ? "المحادثات الفردية" : "Discussions Individuelles"}
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="comm-main-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: 550 }}>
        
        {/* Left Column: Selector */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column" }}>
          
          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={15} color={C.inkSoft} style={{ position: "absolute", left: isRTL ? "auto" : 10, right: isRTL ? 10 : "auto", top: "50%", transform: "translateY(-50%)" }} />
            <input
              placeholder={lang === "ar" ? "بحث…" : "Rechercher…"}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, height: 36, fontSize: 13, paddingLeft: isRTL ? 10 : 32, paddingRight: isRTL ? 32 : 10 }}
            />
          </div>

          {/* Category Filter for Groups */}
          {section === "groups" && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                onClick={() => setCatFilter("all")}
                style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "none", background: catFilter === "all" ? C.accent : "rgba(255,255,255,0.1)", color: catFilter === "all" ? "#120e2e" : C.inkSoft, cursor: "pointer" }}
              >
                {lang === "ar" ? "الكل" : "Tous"}
              </button>
              {SCHOOL_CATS.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCatFilter(cat.id)}
                  style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "none", background: catFilter === cat.id ? cat.color : "rgba(255,255,255,0.1)", color: catFilter === cat.id ? "#120e2e" : C.inkSoft, cursor: "pointer" }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* List items */}
          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 6 }}>
            {section === "groups" ? (
              filteredSubgroups.map(sg => {
                const cat = CAT_BY_ID[sg.categoryId];
                const active = sg.id === selectedSubgroupId;
                return (
                  <div
                    key={sg.id}
                    onClick={() => setSelectedSubgroupId(sg.id)}
                    style={{
                      padding: "10px 12px", borderRadius: 12, cursor: "pointer",
                      background: active ? "rgba(226,150,58,0.15)" : "transparent",
                      border: `1px solid ${active ? C.accent : "transparent"}`,
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: active ? C.accent : C.ink }}>{sg.nom}</div>
                    <div style={{ fontSize: 11.5, color: cat?.color || C.inkSoft, marginTop: 2 }}>
                      {cat?.label} {sg.levelId ? `· ${sg.levelId}` : ""}
                    </div>
                  </div>
                );
              })
            ) : (
              filteredStudents.map(st => {
                const active = st.id === selectedStudentId;
                const sg = data.subgroups.find(s => s.id === st.subgroupId);
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStudentId(st.id)}
                    style={{
                      padding: "10px 12px", borderRadius: 12, cursor: "pointer",
                      background: active ? "rgba(226,150,58,0.15)" : "transparent",
                      border: `1px solid ${active ? C.accent : "transparent"}`,
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: active ? C.accent : C.ink }}>{st.prenom} {st.nom}</div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>{sg?.nom || st.phone}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Box */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column" }}>
          
          {/* Header of Active Chat */}
          <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {section === "groups" ? (
              activeSubgroup ? (
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>{activeSubgroup.nom}</h3>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                    {(data.students || []).filter(s => s.subgroupId === activeSubgroup.id).length} {lang === "ar" ? "تلاميذ في هذا الفوج" : "élèves dans ce groupe"}
                  </div>
                </div>
              ) : null
            ) : (
              activeStudent ? (
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>{activeStudent.prenom} {activeStudent.nom}</h3>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                    {lang === "ar" ? "محادثة خاصة" : "Message privé"} · {activeStudent.phone}
                  </div>
                </div>
              ) : null
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 6 }}>
            {section === "groups" ? (
              groupMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                  {lang === "ar" ? "لا توجد رسائل في هذا الفوج" : "Aucun message dans ce groupe."}
                </div>
              ) : (
                groupMessages.map(m => {
                  const isMe = m.senderRole === "admin";
                  return (
                    <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                      {!isMe && <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", marginBottom: 3 }}>{m.senderName}</div>}
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
            ) : (
              privateMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                  {lang === "ar" ? "لا توجد رسائل خاصة بعد" : "Aucune discussion privée enregistrée."}
                </div>
              ) : (
                privateMessages.map(m => {
                  const isMe = m.senderRole === "admin";
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
              placeholder={lang === "ar" ? "اكتب رسالتك…" : "Écrivez votre message…"}
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
    </div>
  );
}
