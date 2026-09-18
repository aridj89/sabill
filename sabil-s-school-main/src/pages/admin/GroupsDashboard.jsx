import React, { useState, useEffect } from "react";
import { Plus, ArrowLeft, Trash2 } from "lucide-react";
import { C, uid, NIVEAU_ICON } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import Pill from "../../components/ui/Pill";
import AttendanceDots from "../../components/ui/AttendanceDots";
import StudentFormModal from "./StudentFormModal";
import GroupFormModal from "./GroupFormModal";
import { deleteGroupApi, createGroupApi } from "../../utils/groupApi";

export default function GroupsDashboard({ data, setData, filter, setFilter, toastFn }) {
  const { t, isRTL } = useLanguage();
  const [openGroupId, setOpenGroupId] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

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

  useEffect(() => {
    if (filter && filter.type === "Individuel") {
      const existing = data.groups.find(g => g.niveau === filter.niveau && g.annee === filter.annee && g.type === "Individuel");
      if (existing) {
        setOpenGroupId(existing.id);
      } else {
        const newGrp = { id: uid(), niveau: filter.niveau, annee: filter.annee, type: "Individuel", nom: t("typeIndividuel") };
        setData(d => ({ ...d, groups: [...d.groups, newGrp] }));
        setOpenGroupId(newGrp.id);
      }
    } else {
      setOpenGroupId(null);
    }
    // eslint-disable-next-line
  }, [filter]);

  const groupsInFilter = filter ? data.groups.filter(g => g.niveau === filter.niveau && g.annee === filter.annee && g.type === filter.type) : data.groups;
  const openGroup = data.groups.find(g => g.id === openGroupId);

  const notifyAbsence = (student, parent) => {
    if (!parent) return;
    const noteText = isRTL
      ? `كان ${student.prenom} ${student.nom} غائباً في حصة اليوم.`
      : `${student.prenom} ${student.nom} était absent(e) à la séance d'aujourd'hui.`;
    const note = { id: uid(), parentId: parent.id, text: noteText, ts: Date.now(), read: false };
    setData(d => ({ ...d, notifications: [...d.notifications, note] }));
    toastFn(t("notifyAbsenceToast", { name: parent.nom }));
  };

  const toggleDot = (student, idx) => {
    const newPresences = student.presences.map((p, i) => i === idx ? !p : p);
    const becameAbsent = student.presences[idx] === true && newPresences[idx] === false;
    setData(d => ({ ...d, students: d.students.map(s => s.id === student.id ? { ...s, presences: newPresences } : s) }));
    if (becameAbsent) {
      const parent = data.parents.find(p => p.studentId === student.id);
      notifyAbsence(student, parent);
    }
  };

  const togglePaid = (student) => {
    setData(d => ({ ...d, students: d.students.map(s => s.id === student.id ? { ...s, paye: !s.paye } : s) }));
  };

  const removeStudent = (id) => {
    setData(d => ({ ...d, students: d.students.filter(s => s.id !== id) }));
  };

  const removeGroup = async (id, e) => {
    e.stopPropagation();
    if (window.confirm(t("deleteGroupConfirm"))) {
      try {
        await deleteGroupApi(id);
        setData(d => ({
          ...d,
          groups: d.groups.filter(g => g.id !== id),
          students: d.students.filter(s => s.groupId !== id)
        }));
        toastFn(t("groupDeleted"));
      } catch (err) {
        console.error("Erreur suppression groupe:", err);
        alert(err.message || t("groupDeletedError") || "Échec de la suppression du groupe.");
      }
    }
  };

  if (openGroup) {
    const students = data.students.filter(s => s.groupId === openGroup.id);
    return (
      <div>
        <button onClick={() => setOpenGroupId(null)} style={{ border: "none", background: "none", color: C.inkSoft, display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
          <ArrowLeft size={15} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} /> {t("back")}
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 className="f-display" style={{ fontSize: 22, color: C.ink, margin: 0 }}>{openGroup.nom}</h2>
            <p style={{ color: C.inkSoft, fontSize: 13, margin: "4px 0 0" }}>{getNiveauLabel(openGroup.niveau)} · {openGroup.annee} · {getTypeLabel(openGroup.type)} — {students.length} {t("groupStudentsCount")}</p>
          </div>
          <PrimaryBtn onClick={() => setShowAddStudent(true)}><Plus size={16} /> {t("addStudent")}</PrimaryBtn>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {students.map(st => (
            <div key={st.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.accent }}>
                {st.prenom[0]}{st.nom[0]}
              </div>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>{st.prenom} {st.nom}</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft }}>{st.age} {isRTL ? "سنة" : "ans"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 5 }}>{t("monthlyPresences")}</div>
                <AttendanceDots presences={st.presences} onToggle={(i) => toggleDot(st, i)} />
              </div>
              <div style={{ marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Pill good={st.paye} onClick={() => togglePaid(st)}>{st.paye ? t("paid") : t("unpaid")}</Pill>
                <IconBtn icon={Trash2} onClick={() => removeStudent(st.id)} title={t("delete")} />
              </div>
            </div>
          ))}
          {students.length === 0 && <p style={{ color: C.inkSoft }}>{t("noGroupsSubtitle")}</p>}
        </div>

        {showAddStudent && (
          <StudentFormModal groupId={openGroup.id} onClose={() => setShowAddStudent(false)} onSave={(s) => {
            setData(d => ({ ...d, students: [...d.students, s] }));
            setShowAddStudent(false);
            toastFn(t("studentAdded"));
          }} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
            {filter ? `${getNiveauLabel(filter.niveau)} · ${filter.annee} · ${getTypeLabel(filter.type)}` : t("allGroups")}
          </h2>
          <p style={{ color: C.inkSoft, fontSize: 13.5, margin: "5px 0 0" }}>
            {filter ? `${groupsInFilter.length} ${t("categories")}` : (isRTL ? "افتح القائمة ☰ للتصفية حسب المستوى" : "Ouvrez le menu ☰ pour filtrer par niveau")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              style={{
                border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: C.ink,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            >
              {t("all")}
            </button>
          )}
          {filter && <PrimaryBtn onClick={() => setShowAddGroup(true)}><Plus size={16} /> {t("addGroup")}</PrimaryBtn>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18, marginTop: 18 }}>
        {groupsInFilter.map(g => {
          const count = data.students.filter(s => s.groupId === g.id).length;
          const paidCount = data.students.filter(s => s.groupId === g.id && s.paye).length;
          const Icon = NIVEAU_ICON[g.niveau];
          return (
            <div
              key={g.id}
              onClick={() => setOpenGroupId(g.id)}
              style={{
                textAlign: isRTL ? "right" : "left",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "22px 20px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 145,
                transition: "all 0.2s ease",
                boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "rgba(226,150,58,0.5)";
                e.currentTarget.style.boxShadow = "0 16px 36px rgba(0,0,0,0.4), 0 0 16px rgba(226,150,58,0.2)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.25)";
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {Icon && <Icon size={16} color={C.accent} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.inkSoft }}>{getNiveauLabel(g.niveau)} · {g.annee} · {getTypeLabel(g.type)}</span>
                </div>
                <div className="f-display" style={{ fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: 14, lineHeight: 1.3 }}>{g.nom}</div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", position: "relative", zIndex: 2 }}>
                <span style={{ fontSize: 12.5, background: C.navySoft, color: "#fff", padding: "4px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(226,150,58,0.3)" }}>
                  {count} {t("groupStudentsCount")}
                </span>
                <span style={{ fontSize: 12.5, background: paidCount > 0 ? C.goodSoft : "rgba(255,255,255,0.08)", color: paidCount > 0 ? C.good : C.inkSoft, padding: "4px 10px", borderRadius: 999, fontWeight: 700, border: `1px solid ${paidCount > 0 ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                  {paidCount} {t("paid")}
                </span>
                <button
                  onClick={(e) => removeGroup(g.id, e)}
                  style={{
                    marginLeft: isRTL ? 0 : "auto",
                    marginRight: isRTL ? "auto" : 0,
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.25)",
                    borderRadius: 8,
                    color: "rgba(248,113,113,0.9)",
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(248,113,113,0.25)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                  }}
                  title={t("delete")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {groupsInFilter.length === 0 && filter && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.inkSoft }}>
            {t("noGroupsSubtitle")}
          </div>
        )}
      </div>

      {showAddGroup && filter && (
        <GroupFormModal filter={filter} onClose={() => setShowAddGroup(false)} onSave={async (g) => {
          try {
            await createGroupApi(g);
          } catch (err) {
            console.warn("Backend group create notice:", err.message);
          }
          setData(d => ({ ...d, groups: [...d.groups, g] }));
          setShowAddGroup(false);
          toastFn(t("groupCreated"));
        }} />
      )}
    </div>
  );
}
