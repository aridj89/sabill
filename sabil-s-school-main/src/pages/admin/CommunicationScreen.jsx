import React, { useState, useEffect, useRef } from "react";
import {
  Users, User, Send, Search, Plus, Trash2, X, MessageSquare,
  UserPlus, UserMinus, FolderPlus, Phone, Check, ArrowRight, ArrowLeft
} from "lucide-react";
import { C, uid, inputStyle, SCHOOL_CATS, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import { notifyGroupMessage, notifyStudentPrivateMessage } from "../../utils/notificationEngine";

export default function CommunicationScreen({ data, setData, toastFn, initialTarget, onBack, activeYearId }) {
  const { lang, isRTL } = useLanguage();
  const messagesEndRef = useRef(null);

  // Tab: 'groups' | 'private'
  const [section, setSection] = useState(initialTarget?.studentId ? "private" : "groups");

  // Selection
  const [selectedGroupId, setSelectedGroupId] = useState(initialTarget?.groupId || data.groups?.[0]?.id || null);
  const [selectedStudentId, setSelectedStudentId] = useState(initialTarget?.studentId || data.students?.[0]?.id || null);

  // Group sub-view: 'chat' | 'members'
  const [groupView, setGroupView] = useState("chat");

  // Modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("primaire");
  const [newGroupLevel, setNewGroupLevel] = useState("");
  const [newGroupType, setNewGroupType] = useState("Normal");

  // Filters & Search
  const [catFilter, setCatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [addMemberSearch, setAddMemberSearch] = useState("");

  const [text, setText] = useState("");

  // Sync with initialTarget props
  useEffect(() => {
    if (initialTarget?.studentId) {
      setSection("private");
      setSelectedStudentId(initialTarget.studentId);
    } else if (initialTarget?.groupId) {
      setSection("groups");
      setSelectedGroupId(initialTarget.groupId);
    }
  }, [initialTarget?.studentId, initialTarget?.groupId]);

  // Ensure an active group is selected if list changes
  useEffect(() => {
    if (section === "groups" && (!selectedGroupId || !data.groups?.some(g => g.id === selectedGroupId))) {
      if (data.groups && data.groups.length > 0) {
        setSelectedGroupId(data.groups[0].id);
      } else {
        setSelectedGroupId(null);
      }
    }
  }, [data.groups, section, selectedGroupId]);

  // Filtered Groups
  const filteredGroups = (data.groups || []).filter(g => {
    if (catFilter !== "all" && g.categoryId !== catFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (g.nom || "").toLowerCase().includes(q) || (g.levelId || "").toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Students (for private chat)
  const filteredStudents = (data.students || []).filter(st => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = `${st.prenom || ""} ${st.nom || ""}`.toLowerCase();
    return name.includes(q) || (st.phone && st.phone.includes(q)) || (st.studentCode && String(st.studentCode).toLowerCase().includes(q));
  });

  const activeGroup = (data.groups || []).find(g => g.id === selectedGroupId);
  const activeStudent = (data.students || []).find(s => s.id === selectedStudentId);

  // Group Members Calculation
  const enrollmentsForActiveGroup = (data.enrollments || []).filter(e => e.groupId === selectedGroupId);
  const enrolledStudentIds = new Set(enrollmentsForActiveGroup.map(e => e.studentId));
  const activeGroupMembers = (data.students || []).filter(st => 
    enrolledStudentIds.has(st.id) || st.groupId === selectedGroupId
  );

  // Filtered Group Members for display in 'members' view
  const filteredGroupMembers = activeGroupMembers.filter(st => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    const name = `${st.prenom || ""} ${st.nom || ""}`.toLowerCase();
    return name.includes(q) || (st.phone && st.phone.includes(q)) || (st.studentCode && String(st.studentCode).toLowerCase().includes(q));
  });

  // Candidates for adding to group (students not in this group)
  const candidateStudentsToAdd = (data.students || []).filter(st => {
    if (enrolledStudentIds.has(st.id) || st.groupId === selectedGroupId) return false;
    if (!addMemberSearch.trim()) return true;
    const q = addMemberSearch.toLowerCase();
    const name = `${st.prenom || ""} ${st.nom || ""}`.toLowerCase();
    return name.includes(q) || (st.phone && st.phone.includes(q)) || (st.studentCode && String(st.studentCode).toLowerCase().includes(q));
  });

  // Group Messages
  const groupMessages = [
    ...(data.groupMessages || []).filter(m => m.groupId === selectedGroupId),
    ...(data.subgroupMessages || []).filter(m => m.subgroupId === selectedGroupId || m.groupId === selectedGroupId),
  ].sort((a, b) => new Date(a.timestamp || a.ts || 0) - new Date(b.timestamp || b.ts || 0));

  // Private Messages
  const privateMessages = (data.privateMessages || [])
    .filter(m => m.studentId === selectedStudentId)
    .sort((a, b) => new Date(a.timestamp || a.ts || 0) - new Date(b.timestamp || b.ts || 0));

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages.length, privateMessages.length, selectedGroupId, selectedStudentId, groupView]);

  // Send message
  const handleSend = () => {
    if (!text.trim()) return;

    const msgObj = {
      id: uid(),
      senderId: "admin",
      senderRole: "admin",
      senderName: `${data.admin?.prenom || "Admin"} ${data.admin?.nom || ""}`.trim(),
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    if (section === "groups") {
      if (!selectedGroupId) return;
      msgObj.groupId = selectedGroupId;

      setData(d => {
        const notifs = notifyGroupMessage(d, selectedGroupId);
        return {
          ...d,
          groupMessages: [...(d.groupMessages || []), msgObj],
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

  // Create New Group
  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newG = {
      id: uid(),
      nom: newGroupName.trim(),
      categoryId: newGroupCategory || "autre",
      levelId: newGroupLevel || "",
      groupType: newGroupType || "Normal",
      days: [],
      time: "10:00",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 9 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      sessionsPerCycle: 4,
      academicYearId: activeYearId || null,
    };

    setData(d => ({
      ...d,
      groups: [...(d.groups || []), newG]
    }));

    setSelectedGroupId(newG.id);
    setNewGroupName("");
    setNewGroupLevel("");
    setShowAddGroupModal(false);
    setGroupView("chat");
    if (toastFn) toastFn(lang === "ar" ? "تم إنشاء الفوج بنجاح!" : "Groupe créé avec succès !", "success");
  };

  // Add Member to Group
  const handleAddStudentToGroup = (student) => {
    if (!activeGroup) return;

    const newEnrollment = {
      id: uid(),
      studentId: student.id,
      groupId: activeGroup.id,
      academicYearId: activeGroup.academicYearId || activeYearId || null,
      monthlyPrice: activeGroup.price || 0,
    };

    setData(d => ({
      ...d,
      enrollments: [...(d.enrollments || []).filter(e => !(e.studentId === student.id && e.groupId === activeGroup.id)), newEnrollment],
      students: (d.students || []).map(s => s.id === student.id ? { ...s, groupId: activeGroup.id } : s)
    }));

    if (toastFn) {
      toastFn(
        lang === "ar" 
          ? `تمت إضافة ${student.prenom} ${student.nom} إلى ${activeGroup.nom}` 
          : `${student.prenom} ${student.nom} ajouté(e) au groupe ${activeGroup.nom}`,
        "success"
      );
    }
  };

  // Remove Member from Group
  const handleConfirmRemoveMember = () => {
    if (!memberToRemove || !activeGroup) return;

    const studentId = memberToRemove.id;
    setData(d => ({
      ...d,
      enrollments: (d.enrollments || []).filter(e => !(e.studentId === studentId && e.groupId === activeGroup.id)),
      students: (d.students || []).map(s => s.id === studentId && s.groupId === activeGroup.id ? { ...s, groupId: null } : s)
    }));

    if (toastFn) {
      toastFn(
        lang === "ar"
          ? `تم حذف ${memberToRemove.prenom} ${memberToRemove.nom} من الفوج`
          : `${memberToRemove.prenom} ${memberToRemove.nom} retiré(e) du groupe`,
        "info"
      );
    }
    setMemberToRemove(null);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* ── Top Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 800, color: C.ink, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquare size={26} color={C.accent} />
            {lang === "ar" ? "مركز المحادثات والتواصل" : "Centre de Communication"}
          </h2>
          <p style={{ color: C.inkSoft, fontSize: 13, margin: "4px 0 0" }}>
            {lang === "ar" 
              ? "إدارة الأفواج، التواصل المباشر مع المجموعات وإضافة/حذف الأعضاء بكل سهولة" 
              : "Gestion des groupes, échange direct avec les élèves et gestion des membres"}
          </p>
        </div>

        {section === "groups" && (
          <button
            onClick={() => setShowAddGroupModal(true)}
            style={{
              padding: "10px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 700,
              background: "linear-gradient(135deg, #E2963A, #f59e0b)", color: "#120e2e",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 8px 20px rgba(226,150,58,0.35)", transition: "all 0.15s ease"
            }}
          >
            <FolderPlus size={18} />
            {lang === "ar" ? "إنشاء فوج جديد" : "Nouveau Groupe"}
          </button>
        )}
      </div>

      {/* ── Main Section Tabs (Groups vs Private) ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => { setSection("groups"); setGroupView("chat"); }}
          style={{
            padding: "10px 22px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: `1.5px solid ${section === "groups" ? C.accent : "rgba(255,255,255,0.15)"}`,
            background: section === "groups" ? "rgba(226,150,58,0.18)" : "rgba(255,255,255,0.05)",
            color: section === "groups" ? C.accent : C.inkSoft,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s"
          }}
        >
          <Users size={18} />
          {lang === "ar" ? "محادثات الأفواج" : "Discussions de Groupe"}
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
            background: section === "groups" ? C.accent : "rgba(255,255,255,0.15)",
            color: section === "groups" ? "#120e2e" : "#fff"
          }}>
            {(data.groups || []).length}
          </span>
        </button>

        <button
          onClick={() => setSection("private")}
          style={{
            padding: "10px 22px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: `1.5px solid ${section === "private" ? C.accent : "rgba(255,255,255,0.15)"}`,
            background: section === "private" ? "rgba(226,150,58,0.18)" : "rgba(255,255,255,0.05)",
            color: section === "private" ? C.accent : C.inkSoft,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s"
          }}
        >
          <User size={18} />
          {lang === "ar" ? "المحادثات الفردية" : "Discussions Individuelles"}
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
            background: section === "private" ? C.accent : "rgba(255,255,255,0.15)",
            color: section === "private" ? "#120e2e" : "#fff"
          }}>
            {(data.students || []).length}
          </span>
        </button>
      </div>

      {/* ── Main Chat & Management Layout ── */}
      <div className="comm-main-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, height: 600 }}>
        
        {/* ── Left Column: Directory / Selector ── */}
        <div style={{
          background: "linear-gradient(160deg, rgba(22,18,71,0.85) 0%, rgba(71,48,18,0.75) 55%, rgba(18,68,71,0.85) 100%)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <Search size={15} color={C.inkSoft} style={{ position: "absolute", left: isRTL ? "auto" : 12, right: isRTL ? 12 : "auto", top: "50%", transform: "translateY(-50%)" }} />
            <input
              placeholder={section === "groups" ? (lang === "ar" ? "بحث عن فوج…" : "Chercher un groupe…") : (lang === "ar" ? "بحث عن تلميذ…" : "Chercher un élève…")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                ...inputStyle,
                height: 38,
                fontSize: 13,
                paddingLeft: isRTL ? 12 : 36,
                paddingRight: isRTL ? 36 : 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)"
              }}
            />
          </div>

          {/* Category Filter Pills for Groups */}
          {section === "groups" && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button
                onClick={() => setCatFilter("all")}
                style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 8, border: "none",
                  background: catFilter === "all" ? C.accent : "rgba(255,255,255,0.08)",
                  color: catFilter === "all" ? "#120e2e" : C.inkSoft, cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {lang === "ar" ? "الكل" : "Tous"}
              </button>
              {SCHOOL_CATS.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCatFilter(cat.id)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 8, border: "none",
                    background: catFilter === cat.id ? cat.color : "rgba(255,255,255,0.08)",
                    color: catFilter === cat.id ? "#120e2e" : C.inkSoft, cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* List items */}
          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 6, paddingRight: 4 }}>
            {section === "groups" ? (
              filteredGroups.length === 0 ? (
                <div style={{ textAlign: "center", color: C.inkSoft, padding: "40px 10px", fontSize: 13 }}>
                  <Users size={32} style={{ opacity: 0.35, marginBottom: 8, margin: "0 auto" }} />
                  <div>{lang === "ar" ? "لا توجد أفواج حالياً" : "Aucun groupe trouvé"}</div>
                  <button
                    onClick={() => setShowAddGroupModal(true)}
                    style={{
                      marginTop: 12, padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: "rgba(226,150,58,0.2)", border: `1px solid ${C.accent}`, color: C.accent, cursor: "pointer"
                    }}
                  >
                    + {lang === "ar" ? "إنشاء أول فوج" : "Créer le premier groupe"}
                  </button>
                </div>
              ) : (
                filteredGroups.map(g => {
                  const cat = CAT_BY_ID[g.categoryId];
                  const active = g.id === selectedGroupId;
                  const count = (data.enrollments || []).filter(e => e.groupId === g.id).length 
                                || (data.students || []).filter(st => st.groupId === g.id).length;

                  return (
                    <div
                      key={g.id}
                      onClick={() => { setSelectedGroupId(g.id); }}
                      style={{
                        padding: "12px 14px", borderRadius: 14, cursor: "pointer",
                        background: active ? "rgba(226,150,58,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${active ? C.accent : "rgba(255,255,255,0.08)"}`,
                        transition: "all 0.15s ease",
                        display: "flex", flexDirection: "column", gap: 4
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: active ? C.accent : "#fff" }}>
                          {g.nom}
                        </span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                          background: active ? C.accent : "rgba(255,255,255,0.12)",
                          color: active ? "#120e2e" : "rgba(255,255,255,0.7)"
                        }}>
                          {count} {lang === "ar" ? "تلميذ" : "élèves"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: cat?.color || C.inkSoft }}>
                        {cat?.label || "Groupe"} {g.levelId ? `· ${g.levelId}` : ""} {g.groupType ? `· ${g.groupType}` : ""}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              filteredStudents.length === 0 ? (
                <div style={{ textAlign: "center", color: C.inkSoft, padding: "40px 10px", fontSize: 13 }}>
                  <User size={32} style={{ opacity: 0.35, marginBottom: 8, margin: "0 auto" }} />
                  <div>{lang === "ar" ? "لا يوجد تلاميذ" : "Aucun élève trouvé"}</div>
                </div>
              ) : (
                filteredStudents.map(st => {
                  const active = st.id === selectedStudentId;
                  const enrolledGroup = (data.groups || []).find(g => 
                    g.id === st.groupId || (data.enrollments || []).some(e => e.studentId === st.id && e.groupId === g.id)
                  );

                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      style={{
                        padding: "12px 14px", borderRadius: 14, cursor: "pointer",
                        background: active ? "rgba(226,150,58,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${active ? C.accent : "rgba(255,255,255,0.08)"}`,
                        transition: "all 0.15s ease",
                        display: "flex", alignItems: "center", gap: 10
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: active ? C.accent : "rgba(255,255,255,0.12)",
                        color: active ? "#120e2e" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800, flexShrink: 0
                      }}>
                        {st.prenom?.[0] || ""}{st.nom?.[0] || ""}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? C.accent : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {st.prenom} {st.nom}
                        </div>
                        <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {enrolledGroup ? enrolledGroup.nom : (st.phone || "Élève")}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* ── Right Column: Chat Box & Member Manager ── */}
        <div style={{
          background: "linear-gradient(160deg, rgba(22,18,71,0.92) 0%, rgba(71,48,18,0.85) 55%, rgba(18,68,71,0.92) 100%)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          position: "relative"
        }}>
          
          {/* Active Header */}
          <div style={{
            paddingBottom: 14,
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10
          }}>
            {section === "groups" ? (
              activeGroup ? (
                <>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>{activeGroup.nom}</h3>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8,
                        background: "rgba(226,150,58,0.2)", color: C.accent, border: "1px solid rgba(226,150,58,0.4)"
                      }}>
                        {activeGroup.groupType || "Normal"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>
                      {CAT_BY_ID[activeGroup.categoryId]?.label || "Général"} {activeGroup.levelId ? `· ${activeGroup.levelId}` : ""} · {activeGroupMembers.length} {lang === "ar" ? "تلميذ مسجل في هذا الفوج" : "élèves inscrits"}
                    </div>
                  </div>

                  {/* Switcher: Discussion vs Membres + Add Member button */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: "rgba(0,0,0,0.25)", padding: 3, borderRadius: 10, display: "flex", gap: 4 }}>
                      <button
                        onClick={() => setGroupView("chat")}
                        style={{
                          padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, border: "none",
                          background: groupView === "chat" ? C.accent : "transparent",
                          color: groupView === "chat" ? "#120e2e" : "rgba(255,255,255,0.8)",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s"
                        }}
                      >
                        <MessageSquare size={14} />
                        {lang === "ar" ? "المحادثة" : "Discussion"}
                      </button>

                      <button
                        onClick={() => setGroupView("members")}
                        style={{
                          padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, border: "none",
                          background: groupView === "members" ? C.accent : "transparent",
                          color: groupView === "members" ? "#120e2e" : "rgba(255,255,255,0.8)",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s"
                        }}
                      >
                        <Users size={14} />
                        {lang === "ar" ? `الأعضاء (${activeGroupMembers.length})` : `Membres (${activeGroupMembers.length})`}
                      </button>
                    </div>

                    <button
                      onClick={() => { setAddMemberSearch(""); setShowAddMemberModal(true); }}
                      style={{
                        padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                        background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.5)",
                        color: "#4ade80", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        transition: "all 0.15s"
                      }}
                    >
                      <UserPlus size={15} />
                      {lang === "ar" ? "إضافة تلميذ" : "+ Ajouter un élève"}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: C.inkSoft }}>{lang === "ar" ? "يرجى اختيار فوج" : "Veuillez sélectionner un groupe"}</div>
              )
            ) : (
              activeStudent ? (
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
                    {activeStudent.prenom} {activeStudent.nom}
                  </h3>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{lang === "ar" ? "محادثة خاصة ومباشرة" : "Discussion privée directe"}</span>
                    {activeStudent.phone && <span>· 📞 {activeStudent.phone}</span>}
                  </div>
                </div>
              ) : (
                <div style={{ color: C.inkSoft }}>{lang === "ar" ? "يرجى اختيار تلميذ" : "Veuillez sélectionner un élève"}</div>
              )
            )}
          </div>

          {/* ── Sub-view 1: Chat Messages (for groups or private) ── */}
          {(section === "private" || groupView === "chat") && (
            <>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 6 }}>
                {section === "groups" ? (
                  !activeGroup ? (
                    <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                      {lang === "ar" ? "اختر فوجاً من القائمة الجانبية لبدء المحادثة" : "Sélectionnez un groupe pour afficher la discussion."}
                    </div>
                  ) : groupMessages.length === 0 ? (
                    <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                      <MessageSquare size={36} style={{ opacity: 0.35, marginBottom: 8, margin: "0 auto" }} />
                      <div>{lang === "ar" ? "لا توجد رسائل في هذا الفوج بعد" : "Aucun message dans ce groupe pour le moment."}</div>
                      <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 4 }}>
                        {lang === "ar" ? "اكتب رسالة في الأسفل للتواصل مع جميع تلاميذ هذا الفوج" : "Envoyez un message pour démarrer l'échange avec tous les élèves du groupe."}
                      </div>
                    </div>
                  ) : (
                    groupMessages.map(m => {
                      const isMe = m.senderRole === "admin";
                      return (
                        <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                          {!isMe && (
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#93c5fd", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                              <span>👤 {m.senderName || "Élève"}</span>
                            </div>
                          )}
                          <div style={{
                            padding: "10px 16px",
                            borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            background: isMe ? "linear-gradient(135deg, #E2963A, #d97706)" : "rgba(255,255,255,0.08)",
                            border: `1px solid ${isMe ? "rgba(226,150,58,0.5)" : "rgba(255,255,255,0.15)"}`,
                            color: isMe ? "#120e2e" : "#fff",
                            fontSize: 14,
                            fontWeight: isMe ? 600 : 400,
                            lineHeight: 1.45,
                            boxShadow: isMe ? "0 4px 12px rgba(226,150,58,0.25)" : "none"
                          }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  !activeStudent ? (
                    <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                      {lang === "ar" ? "اختر تلميذاً من القائمة لبدء المحادثة الخاصة" : "Sélectionnez un élève pour afficher la conversation."}
                    </div>
                  ) : privateMessages.length === 0 ? (
                    <div style={{ textAlign: "center", color: C.inkSoft, margin: "auto", fontSize: 13 }}>
                      <User size={36} style={{ opacity: 0.35, marginBottom: 8, margin: "0 auto" }} />
                      <div>{lang === "ar" ? "لا توجد رسائل خاصة مع هذا التلميذ بعد" : "Aucune discussion privée avec cet élève pour le moment."}</div>
                      <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 4 }}>
                        {lang === "ar" ? "أرسل رسالة خاصة تصل إلى تطبيق التلميذ مباشرة" : "Envoyez un message qui apparaîtra directement sur l'application de l'élève."}
                      </div>
                    </div>
                  ) : (
                    privateMessages.map(m => {
                      const isMe = m.senderRole === "admin";
                      return (
                        <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                          <div style={{
                            padding: "10px 16px",
                            borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            background: isMe ? "linear-gradient(135deg, #E2963A, #d97706)" : "rgba(255,255,255,0.08)",
                            border: `1px solid ${isMe ? "rgba(226,150,58,0.5)" : "rgba(255,255,255,0.15)"}`,
                            color: isMe ? "#120e2e" : "#fff",
                            fontSize: 14,
                            fontWeight: isMe ? 600 : 400,
                            lineHeight: 1.45,
                            boxShadow: isMe ? "0 4px 12px rgba(226,150,58,0.25)" : "none"
                          }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </div>
                        </div>
                      );
                    })
                  )
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div style={{ display: "flex", gap: 10, marginTop: 4, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <input
                  style={{ ...inputStyle, flex: 1, borderRadius: 14, height: 44 }}
                  placeholder={
                    section === "groups" 
                      ? (lang === "ar" ? `اكتب رسالة إلى ${activeGroup?.nom || "الفوج"}…` : `Écrire un message à tous les membres de ${activeGroup?.nom || "ce groupe"}…`)
                      : (lang === "ar" ? `اكتب رسالة خاصة إلى ${activeStudent?.prenom || "التلميذ"}…` : `Écrire un message privé à ${activeStudent?.prenom || "l'élève"}…`)
                  }
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={section === "groups" ? !activeGroup : !activeStudent}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || (section === "groups" ? !activeGroup : !activeStudent)}
                  style={{
                    padding: "0 22px", borderRadius: 14,
                    background: text.trim() ? "linear-gradient(135deg, #E2963A, #f59e0b)" : "rgba(255,255,255,0.1)",
                    border: "none", color: text.trim() ? "#120e2e" : "rgba(255,255,255,0.4)",
                    fontWeight: 800, cursor: text.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.15s ease",
                    boxShadow: text.trim() ? "0 4px 14px rgba(226,150,58,0.35)" : "none"
                  }}
                >
                  <Send size={17} />
                  <span>{lang === "ar" ? "إرسال" : "Envoyer"}</span>
                </button>
              </div>
            </>
          )}

          {/* ── Sub-view 2: Members Management View ── */}
          {section === "groups" && groupView === "members" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} color={C.inkSoft} style={{ position: "absolute", left: isRTL ? "auto" : 12, right: isRTL ? 12 : "auto", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    placeholder={lang === "ar" ? "بحث في أعضاء هذا الفوج…" : "Rechercher parmi les membres de ce groupe…"}
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    style={{
                      ...inputStyle,
                      height: 36,
                      fontSize: 12.5,
                      paddingLeft: isRTL ? 12 : 34,
                      paddingRight: isRTL ? 34 : 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.06)"
                    }}
                  />
                </div>

                <button
                  onClick={() => { setAddMemberSearch(""); setShowAddMemberModal(true); }}
                  style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.5)",
                    color: "#4ade80", cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  <UserPlus size={15} />
                  {lang === "ar" ? "إضافة تلميذ" : "+ Ajouter un élève"}
                </button>
              </div>

              {/* Members List */}
              <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 8, paddingRight: 4 }}>
                {filteredGroupMembers.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.inkSoft, padding: "40px 10px" }}>
                    <Users size={36} style={{ opacity: 0.35, marginBottom: 8, margin: "0 auto" }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {activeGroupMembers.length === 0 
                        ? (lang === "ar" ? "لا يوجد أي تلميذ مسجل في هذا الفوج حالياً" : "Aucun élève inscrit dans ce groupe.")
                        : (lang === "ar" ? "لا توجد نتائج مطابقة للبحث" : "Aucun résultat pour cette recherche.")}
                    </div>
                    {activeGroupMembers.length === 0 && (
                      <button
                        onClick={() => { setAddMemberSearch(""); setShowAddMemberModal(true); }}
                        style={{
                          marginTop: 14, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                          background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.5)",
                          color: "#4ade80", cursor: "pointer"
                        }}
                      >
                        + {lang === "ar" ? "إضافة أول تلميذ للفوج" : "Ajouter le premier élève"}
                      </button>
                    )}
                  </div>
                ) : (
                  filteredGroupMembers.map(st => (
                    <div
                      key={st.id}
                      style={{
                        padding: "12px 16px", borderRadius: 14,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%",
                          background: "linear-gradient(135deg, rgba(226,150,58,0.4), rgba(226,150,58,0.2))",
                          border: "1px solid rgba(226,150,58,0.5)",
                          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 800
                        }}>
                          {st.prenom?.[0] || ""}{st.nom?.[0] || ""}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                            {st.prenom} {st.nom}
                          </div>
                          <div style={{ fontSize: 11.5, color: C.inkSoft, display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                            {st.phone && <span>📞 {st.phone}</span>}
                            {st.studentCode && <span>· 🆔 {st.studentCode}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Member Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Go to private chat */}
                        <button
                          onClick={() => {
                            setSelectedStudentId(st.id);
                            setSection("private");
                          }}
                          title={lang === "ar" ? "محادثة خاصة" : "Discussion privée"}
                          style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                          }}
                        >
                          <MessageSquare size={13} color={C.accent} />
                          <span>{lang === "ar" ? "محادثة خاصة" : "Message"}</span>
                        </button>

                        {/* Remove from group */}
                        <button
                          onClick={() => setMemberToRemove(st)}
                          title={lang === "ar" ? "حذف من الفوج" : "Retirer du groupe"}
                          style={{
                            padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)",
                            color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                          }}
                        >
                          <Trash2 size={13} />
                          <span>{lang === "ar" ? "حذف" : "Retirer"}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Create New Group ("tftah groupe w tsamih wch habt") ── */}
      {showAddGroupModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}
          onClick={() => setShowAddGroupModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 440, maxWidth: "100%",
              background: "linear-gradient(160deg, rgba(22,18,71,0.98) 0%, rgba(71,48,18,0.95) 55%, rgba(18,68,71,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.22)", borderRadius: 22, padding: 24,
              boxShadow: "0 24px 60px rgba(0,0,0,0.65)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <FolderPlus size={20} color={C.accent} />
                {lang === "ar" ? "إنشاء وتسمية فوج جديد" : "Créer un nouveau groupe"}
              </h3>
              <button
                onClick={() => setShowAddGroupModal(false)}
                style={{ background: "transparent", border: "none", color: C.inkSoft, cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
                  {lang === "ar" ? "اسم الفوج (سميه كما تريد) *" : "Nom du groupe (choisissez librement le nom) *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === "ar" ? "مثال: مراجعة بكالوريا، فرنسية B2، رياضيات..." : "Ex: Groupe B2 Soir, Révision BAC Math..."}
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{ ...inputStyle, borderRadius: 12, height: 42 }}
                  autoFocus
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
                    {lang === "ar" ? "المرحلة / الطور" : "Catégorie"}
                  </label>
                  <select
                    value={newGroupCategory}
                    onChange={e => setNewGroupCategory(e.target.value)}
                    style={{ ...inputStyle, borderRadius: 12, height: 42, cursor: "pointer" }}
                  >
                    <option value="primaire" style={{ color: "#000" }}>Primaire (ابتدائي)</option>
                    <option value="cem" style={{ color: "#000" }}>CEM (متوسط)</option>
                    <option value="lycee" style={{ color: "#000" }}>Lycée (ثانوي)</option>
                    <option value="langues" style={{ color: "#000" }}>Langues (لغات)</option>
                    <option value="autre" style={{ color: "#000" }}>Autre (أخرى)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
                    {lang === "ar" ? "نوع الفوج" : "Type de groupe"}
                  </label>
                  <select
                    value={newGroupType}
                    onChange={e => setNewGroupType(e.target.value)}
                    style={{ ...inputStyle, borderRadius: 12, height: 42, cursor: "pointer" }}
                  >
                    <option value="Normal" style={{ color: "#000" }}>Normal</option>
                    <option value="Soutien" style={{ color: "#000" }}>Soutien</option>
                    <option value="Spécial" style={{ color: "#000" }}>Spécial</option>
                    <option value="Individuel" style={{ color: "#000" }}>Individuel</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
                  {lang === "ar" ? "المستوى الدراسي (اختياري)" : "Niveau scolaire (optionnel)"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "ar" ? "مثال: 5ème, 1ère, B2, C1..." : "Ex: 4ème, B1, BAC..."}
                  value={newGroupLevel}
                  onChange={e => setNewGroupLevel(e.target.value)}
                  style={{ ...inputStyle, borderRadius: 12, height: 42 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", cursor: "pointer"
                  }}
                >
                  {lang === "ar" ? "إلغاء" : "Annuler"}
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  style={{
                    padding: "10px 22px", borderRadius: 12, fontSize: 13, fontWeight: 800,
                    background: "linear-gradient(135deg, #E2963A, #f59e0b)", border: "none",
                    color: "#120e2e", cursor: newGroupName.trim() ? "pointer" : "not-allowed",
                    boxShadow: "0 6px 18px rgba(226,150,58,0.35)"
                  }}
                >
                  {lang === "ar" ? "إنشاء وفتح الفوج" : "Créer et ouvrir le groupe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Member to Group ("add mombre") ── */}
      {showAddMemberModal && activeGroup && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 480, maxWidth: "100%", maxHeight: "85vh",
              background: "linear-gradient(160deg, rgba(22,18,71,0.98) 0%, rgba(71,48,18,0.95) 55%, rgba(18,68,71,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.22)", borderRadius: 22, padding: 22,
              boxShadow: "0 24px 60px rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", gap: 14
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <UserPlus size={20} color="#4ade80" />
                  {lang === "ar" ? `إضافة تلميذ إلى ${activeGroup.nom}` : `Ajouter un élève à ${activeGroup.nom}`}
                </h3>
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>
                  {lang === "ar" ? "اختر تلميذاً من قائمة تلاميذ المؤسسة لإضافته لهذا الفوج" : "Sélectionnez un élève de l'école à inscrire dans ce groupe"}
                </div>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{ background: "transparent", border: "none", color: C.inkSoft, cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={14} color={C.inkSoft} style={{ position: "absolute", left: isRTL ? "auto" : 12, right: isRTL ? 12 : "auto", top: "50%", transform: "translateY(-50%)" }} />
              <input
                placeholder={lang === "ar" ? "ابحث بالاسم، اللقب أو الهاتف…" : "Rechercher par nom, prénom ou téléphone…"}
                value={addMemberSearch}
                onChange={e => setAddMemberSearch(e.target.value)}
                style={{ ...inputStyle, borderRadius: 12, height: 40, paddingLeft: isRTL ? 12 : 36, paddingRight: isRTL ? 36 : 12 }}
                autoFocus
              />
            </div>

            {/* Candidate List */}
            <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 8, maxHeight: 340, paddingRight: 4 }}>
              {candidateStudentsToAdd.length === 0 ? (
                <div style={{ textAlign: "center", color: C.inkSoft, padding: "30px 10px", fontSize: 13 }}>
                  {data.students?.length === 0 
                    ? (lang === "ar" ? "لا يوجد تلاميذ مسجلين في المدرسة بعد." : "Aucun élève enregistré dans l'établissement.")
                    : (lang === "ar" ? "جميع التلاميذ مسجلون بالفعل في هذا الفوج أو لا توجد نتائج مطابقة." : "Tous les élèves sont déjà inscrits dans ce groupe ou aucun résultat.")}
                </div>
              ) : (
                candidateStudentsToAdd.map(st => (
                  <div
                    key={st.id}
                    style={{
                      padding: "10px 14px", borderRadius: 12,
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "rgba(255,255,255,0.12)", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800
                      }}>
                        {st.prenom?.[0] || ""}{st.nom?.[0] || ""}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>
                          {st.prenom} {st.nom}
                        </div>
                        <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 1 }}>
                          {st.phone ? `📞 ${st.phone}` : (st.studentCode || "Élève")}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddStudentToGroup(st)}
                      style={{
                        padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: "linear-gradient(135deg, #4ade80, #22c55e)", border: "none",
                        color: "#0f371e", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        boxShadow: "0 4px 10px rgba(74,222,128,0.25)"
                      }}
                    >
                      <UserPlus size={14} />
                      {lang === "ar" ? "إضافة" : "Ajouter"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{
                  padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: C.accent, border: "none", color: "#120e2e", cursor: "pointer"
                }}
              >
                {lang === "ar" ? "تم / إغلاق" : "Fermer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Remove Member ("delet membres") ── */}
      {memberToRemove && activeGroup && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 310,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}
          onClick={() => setMemberToRemove(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 380, maxWidth: "100%",
              background: "linear-gradient(160deg, rgba(35,15,15,0.98) 0%, rgba(45,20,15,0.96) 55%, rgba(25,10,25,0.98) 100%)",
              border: "1px solid rgba(248,113,113,0.3)", borderRadius: 20, padding: 22,
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "rgba(248,113,113,0.2)", color: "#f87171",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>
                  {lang === "ar" ? "تأكيد حذف التلميذ" : "Confirmer le retrait"}
                </h4>
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                  {activeGroup.nom}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, margin: "0 0 18px" }}>
              {lang === "ar"
                ? `هل أنت متأكد من رغبتك في إزالة التلميذ "${memberToRemove.prenom} ${memberToRemove.nom}" من الفوج "${activeGroup.nom}"؟`
                : `Voulez-vous vraiment retirer l'élève "${memberToRemove.prenom} ${memberToRemove.nom}" du groupe "${activeGroup.nom}" ?`}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setMemberToRemove(null)}
                style={{
                  padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", cursor: "pointer"
                }}
              >
                {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
              <button
                onClick={handleConfirmRemoveMember}
                style={{
                  padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none",
                  color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(239,68,68,0.35)"
                }}
              >
                {lang === "ar" ? "تأكيد الحذف" : "Retirer de ce groupe"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
