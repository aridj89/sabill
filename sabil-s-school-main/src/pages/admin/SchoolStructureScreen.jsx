import React, { useState } from "react";
import {
  Plus, Trash2, Users, CalendarDays, ChevronRight,
  BookOpen, AlertTriangle, Edit2, Languages,
} from "lucide-react";
import { C, uid, CAT_BY_ID, SCHOOL_CATS, computeCycles, generateSessions } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import GroupFormModal from "./GroupFormModal";

/* ── Sub-group card ──────────────────────────────────────────── */
function GroupCard({ sg, data, catColor, catBg, catBorder, onOpen, onAddStudent, onEdit, onDelete }) {
  const { lang } = useLanguage();

  // Find all student IDs enrolled in this specific group by groupId
  const groupEnrollments = (data.enrollments || []).filter(e => e.groupId === sg.id);
  const enrolledStudentIds = new Set(groupEnrollments.map(e => e.studentId));

  const students = (data.students || []).filter(s => {
    if (enrolledStudentIds.has(s.id)) return true;
    const hasEnrollment = (data.enrollments || []).some(e => e.studentId === s.id);
    if (!hasEnrollment && s.groupId === sg.id) return true;
    return false;
  });

  const sessions  = (data.sessions || []).filter(s => s.groupId === sg.id);
  const done      = sessions.filter(s => s.status === "done").length;
  const planned   = sessions.filter(s => s.status === "planned").length;
  const unpaidCount = (data.payments || []).filter(p => p.groupId === sg.id && !p.paid).length;
  const enrollUnpaid = students.filter(s => !s.enrollmentPaid).length;

  return (
    <div
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "20px 18px", cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 14,
        transition: "all 0.2s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        minHeight: 180,
      }}
      onClick={onOpen}
      onMouseEnter={e => { e.currentTarget.style.borderColor = catColor; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 16px 36px rgba(0,0,0,0.35),0 0 16px ${catBg}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="f-display" style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{sg.nom}</span>
            {sg.groupType && (
              <span style={{ fontSize: 11, background: catBg, color: catColor, border: `1px solid ${catBorder}`, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                {sg.groupType}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: catColor, fontWeight: 600, marginTop: 4 }}>
            {sg.days && sg.days.length > 0 ? `${sg.days.join(", ")} · ${sg.time || "10:00"}` : (lang === "ar" ? "الفوج جاهز للتسجيل" : "Groupe prêt pour les inscriptions")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} title={lang === "ar" ? "تعديل الفوج" : "Modifier"} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkSoft, cursor: "pointer" }}>
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete} title={lang === "ar" ? "حذف" : "Supprimer"} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", alignItems: "center" }}>
        <span style={{ fontSize: 12, background: catBg, color: catColor, padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: `1px solid ${catBorder}` }}>
          <Users size={11} style={{ display: "inline", marginRight: 4 }} />{students.length} {lang === "ar" ? "تلميذ" : "élèves"}
        </span>
        {sessions.length > 0 && (
          <>
            <span style={{ fontSize: 12, background: "rgba(74,222,128,0.12)", color: "#4ade80", padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(74,222,128,0.3)" }}>
              {done} ✓
            </span>
            <span style={{ fontSize: 12, background: "rgba(99,102,241,0.12)", color: "#818cf8", padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(99,102,241,0.3)" }}>
              {planned} {lang === "ar" ? "مقررة" : "prévues"}
            </span>
          </>
        )}
        {unpaidCount > 0 && (
          <span style={{ fontSize: 12, background: "rgba(248,113,113,0.12)", color: "#f87171", padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(248,113,113,0.3)" }}>
            <AlertTriangle size={10} style={{ display: "inline", marginRight: 3 }} />{unpaidCount} {lang === "ar" ? "غير مدفوع" : "impayé(s)"}
          </span>
        )}
      </div>

      {/* Quick Add Student Button */}
      <div style={{ marginTop: "auto", paddingTop: 6, display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={onAddStudent}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 10,
            background: "linear-gradient(135deg, rgba(226,150,58,0.25), rgba(226,150,58,0.15))",
            border: "1px solid rgba(226,150,58,0.45)", color: "#fff",
            fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s ease"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(226,150,58,0.4), rgba(226,150,58,0.25))"}
          onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(226,150,58,0.25), rgba(226,150,58,0.15))"}
        >
          <Plus size={14} color="#E2963A" />
          {lang === "ar" ? "+ تسجيل تلميذ" : "+ Inscrire un élève"}
        </button>
        <button
          onClick={onOpen}
          style={{
            padding: "8px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
            color: C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
          }}
        >
          {lang === "ar" ? "عرض الفوج" : "Ouvrir"} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function SchoolStructureScreen({ catId, levelId, groupType, data, setData, toastFn, onNav, activeYearId }) {
  const { lang } = useLanguage();
  const cat = CAT_BY_ID[catId];
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");

  const isLangues = catId === "langues";
  const levelLabel = isLangues
    ? (data?.langLevels?.find(l => l.id === levelId)?.nom || "")
    : levelId;

  // Safe checks & empty state fallbacks
  const safeGroups = Array.isArray(data?.groups) ? data.groups : [];

  // Filter groups strictly by categoryId AND levelId AND academicYearId
  const effectiveYearId = activeYearId || data?.activeYearId;
  let groups = safeGroups.filter(sg => {
    if (!sg) return false;
    if (catId && sg.categoryId !== catId) return false;
    if (levelId && sg.levelId !== levelId) return false;
    if (effectiveYearId && sg.academicYearId && sg.academicYearId !== effectiveYearId) return false;
    return true;
  });

  const handleCreate = (sg, newSessions) => {
    // Store in groups array (main data store) and generate sessions using groupId
    const sgWithGroupId = { ...sg };
    const sessionsWithGroupId = (newSessions || []).map(s => ({ ...s, groupId: sg.id }));
    setData(d => ({
      ...d,
      groups: [...(d.groups || []), sgWithGroupId],
      sessions: [...(d.sessions || []), ...sessionsWithGroupId],
    }));
    setShowAdd(false);
    if (toastFn) toastFn(lang === "ar" ? "تم إنشاء المجموعة ✓" : "Groupe créé ✓");
  };

  const handleEdit = (sg) => {
    setData(d => ({ ...d, groups: (d.groups || []).map(x => x.id === sg.id ? sg : x) }));
    setEditing(null);
    if (toastFn) toastFn(lang === "ar" ? "تم تعديل المجموعة ✓" : "Groupe modifié ✓");
  };

  const handleDelete = (id) => {
    if (!window.confirm(lang === "ar" ? "هل تريد حذف هذه المجموعة وكل بياناتها؟" : "Supprimer ce groupe et toutes ses données ?")) return;
    setData(d => ({
      ...d,
      groups:   (d.groups || []).filter(sg => sg.id !== id),
      students:    (d.students || []).filter(s => s.groupId !== id && s.groupId !== id),
      sessions:    (d.sessions || []).filter(s => s.groupId !== id && s.groupId !== id),
      attendances: (d.attendances || []).filter(a => {
        const sess = (d.sessions || []).find(s => s.id === a.sessionId);
        return sess && sess.groupId !== id && sess.groupId !== id;
      }),
      payments:    (d.payments || []).filter(p => p.groupId !== id && p.groupId !== id),
    }));
    if (toastFn) toastFn(lang === "ar" ? "تم الحذف" : "Supprimé");
  };

  const addLangLevel = () => {
    if (!newLevelName.trim()) return;
    const newLvl = { id: uid(), nom: newLevelName.trim() };
    setData(d => ({ ...d, langLevels: [...(d.langLevels || []), newLvl] }));
    setNewLevelName("");
    setShowAddLevel(false);
    if (toastFn) toastFn(lang === "ar" ? "تمت إضافة المستوى ✓" : "Niveau ajouté ✓");
  };

  const deleteLangLevel = (id) => {
    if (!window.confirm(lang === "ar" ? "حذف هذا المستوى؟" : "Supprimer ce niveau ?")) return;
    setData(d => ({ ...d, langLevels: d.langLevels.filter(l => l.id !== id) }));
  };

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            {cat && (
              <div style={{ width: 32, height: 32, borderRadius: 9, background: cat.bg, border: `1px solid ${cat.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <cat.icon size={16} color={cat.color} />
              </div>
            )}
            <h2 className="f-display" style={{ fontSize: 22, fontWeight: 700, color: C.ink, margin: 0 }}>
              {cat ? cat.label : (lang === "ar" ? "كل المجموعات" : "Tous les groupes")}
              {levelLabel && <span style={{ color: cat?.color, marginLeft: 8 }}>· {levelLabel}</span>}
              {groupType && <span style={{ color: C.inkSoft, fontSize: 16, marginLeft: 8 }}>· {groupType}</span>}
            </h2>
          </div>
          <p style={{ color: C.inkSoft, fontSize: 13, margin: 0 }}>
            {groups.length} {lang === "ar" ? "مجموعة" : "groupe(s)"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {isLangues && !levelId && (
            <>
              {showAddLevel ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    value={newLevelName}
                    onChange={e => setNewLevelName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addLangLevel()}
                    placeholder="A1, A2, B1…"
                    style={{ height: 38, padding: "0 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13.5, color: C.ink, background: "rgba(255,255,255,0.1)", outline: "none" }}
                  />
                  <PrimaryBtn onClick={addLangLevel}>{lang === "ar" ? "إضافة" : "Ajouter"}</PrimaryBtn>
                </div>
              ) : (
                <PrimaryBtn onClick={() => setShowAddLevel(true)}>
                  <Plus size={16} /> {lang === "ar" ? "+ مستوى" : "+ Niveau"}
                </PrimaryBtn>
              )}
            </>
          )}
          {(levelId || isLangues) && (
            <PrimaryBtn onClick={() => setShowAdd(true)}>
              <Plus size={16} /> {lang === "ar" ? "+ مجموعة" : "+ Groupe"}
            </PrimaryBtn>
          )}
        </div>
      </div>

      {/* ── Langues: level list ───────────────────────────────── */}
      {isLangues && !levelId && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {(data.langLevels || []).map(ll => (
            <div
              key={ll.id}
              onClick={() => onNav({ screen: "structure", catId: "langues", levelId: ll.id, groupType: null })}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "22px 18px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 32, fontWeight: 800, color: cat.color, fontFamily: "monospace" }}>{ll.nom}</div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>
                {(data.groups || []).filter(sg => sg.categoryId === "langues" && sg.levelId === ll.id).length} {lang === "ar" ? "مجموعة" : "groupe(s)"}
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteLangLevel(ll.id); }}
                style={{ marginTop: 10, background: "none", border: "none", color: "rgba(248,113,113,0.5)", cursor: "pointer", padding: 4 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {(data.langLevels || []).length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.inkSoft, padding: "30px 0" }}>
              {lang === "ar" ? "لا توجد مستويات — أضف مستوى جديداً" : "Aucun niveau — Créez votre premier niveau"}
            </div>
          )}
        </div>
      )}

      {/* ── Groups grid ───────────────────────────────────── */}
      {(!isLangues || levelId || !catId) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {groups.map(sg => {
            const sgCat = CAT_BY_ID[sg.categoryId] || cat;
            return (
              <GroupCard
                key={sg.id}
                sg={sg} data={data}
                catColor={sgCat?.color} catBg={sgCat?.bg} catBorder={sgCat?.border}
                onOpen={() => onNav({ screen: "group", groupId: sg.id, catId: sg.categoryId, levelId: sg.levelId, groupType: sg.groupType })}
                onAddStudent={() => onNav({ screen: "group", groupId: sg.id, catId: sg.categoryId, levelId: sg.levelId, groupType: sg.groupType, openAddStudent: true })}
                onEdit={() => setEditing(sg)}
                onDelete={() => handleDelete(sg.id)}
              />
            );
          })}
          {groups.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.inkSoft }}>
              {lang === "ar" ? "لا توجد مجموعات — أنشئ مجموعة جديدة" : "Aucun sous-groupe — Créez le premier"}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      {showAdd && (
        <GroupFormModal
          catId={catId} levelId={levelId} levelLabel={levelLabel} groupType={groupType}
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}
      {editing && (
        <GroupFormModal
          catId={editing.categoryId || editing.catId || catId}
          levelId={editing.levelId} levelLabel={isLangues ? (data.langLevels?.find(l => l.id === editing.levelId)?.nom || editing.levelId) : editing.levelId} groupType={editing.groupType}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
