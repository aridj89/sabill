import React, { useState } from "react";
import {
  Plus, Trash2, Users, CalendarDays, ChevronRight,
  BookOpen, AlertTriangle, Edit2, Languages,
} from "lucide-react";
import { C, uid, CAT_BY_ID, SCHOOL_CATS, computeCycles, generateSessions } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import SubgroupFormModal from "./SubgroupFormModal";

/* ── Sub-group card ──────────────────────────────────────────── */
function SubgroupCard({ sg, data, catColor, catBg, catBorder, onOpen, onEdit, onDelete }) {
  const { lang } = useLanguage();
  const students  = data.students.filter(s => s.subgroupId === sg.id);
  const sessions  = data.sessions.filter(s => s.subgroupId === sg.id);
  const done      = sessions.filter(s => s.status === "done").length;
  const planned   = sessions.filter(s => s.status === "planned").length;
  const cycles    = computeCycles(sessions, sg);
  const unpaidCount = data.payments.filter(p => p.subgroupId === sg.id && !p.paid).length;
  const enrollUnpaid = students.filter(s => !s.enrollmentPaid).length;

  return (
    <div
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "20px 18px", cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 14,
        transition: "all 0.2s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        minHeight: 160,
      }}
      onClick={onOpen}
      onMouseEnter={e => { e.currentTarget.style.borderColor = catColor; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 16px 36px rgba(0,0,0,0.35),0 0 16px ${catBg}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="f-display" style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{sg.nom}</div>
          <div style={{ fontSize: 12, color: catColor, fontWeight: 600, marginTop: 4 }}>
            {sg.days?.join(", ")} · {sg.time}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkSoft, cursor: "pointer" }}>
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 12, background: catBg, color: catColor, padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: `1px solid ${catBorder}` }}>
          <Users size={11} style={{ display: "inline", marginRight: 4 }} />{students.length}
        </span>
        <span style={{ fontSize: 12, background: "rgba(74,222,128,0.12)", color: "#4ade80", padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(74,222,128,0.3)" }}>
          {done} ✓
        </span>
        <span style={{ fontSize: 12, background: "rgba(99,102,241,0.12)", color: "#818cf8", padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(99,102,241,0.3)" }}>
          {planned} {lang === "ar" ? "مقررة" : "prévues"}
        </span>
        {unpaidCount > 0 && (
          <span style={{ fontSize: 12, background: "rgba(248,113,113,0.12)", color: "#f87171", padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(248,113,113,0.3)" }}>
            <AlertTriangle size={10} style={{ display: "inline", marginRight: 3 }} />{unpaidCount} {lang === "ar" ? "غير مدفوع" : "impayé(s)"}
          </span>
        )}
        {enrollUnpaid > 0 && (
          <span style={{ fontSize: 12, background: "rgba(251,191,36,0.12)", color: "#fbbf24", padding: "3px 10px", borderRadius: 999, fontWeight: 700, border: "1px solid rgba(251,191,36,0.3)" }}>
            {enrollUnpaid} {lang === "ar" ? "تسجيل معلق" : "inscr."}
          </span>
        )}
        <span style={{ fontSize: 12, color: C.inkSoft, marginLeft: "auto", alignSelf: "center" }}>
          {sg.price} DA
        </span>
      </div>
    </div>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function SchoolStructureScreen({ catId, levelId, groupType, data, setData, toastFn, onNav }) {
  const { lang } = useLanguage();
  const cat = CAT_BY_ID[catId];
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");

  const isLangues = catId === "langues";
  const levelLabel = isLangues
    ? (data.langLevels?.find(l => l.id === levelId)?.nom || "")
    : levelId;

  // Filter subgroups
  const subgroups = (data.subgroups || []).filter(sg => {
    if (sg.categoryId !== catId) return false;
    if (levelId && sg.levelId !== levelId) return false;
    if (!isLangues && groupType && sg.groupType !== groupType) return false;
    return true;
  });

  const handleCreate = (sg, newSessions) => {
    setData(d => ({
      ...d,
      subgroups: [...(d.subgroups || []), sg],
      sessions: [...(d.sessions || []), ...(newSessions || [])],
    }));
    setShowAdd(false);
    if (toastFn) toastFn(lang === "ar" ? "تم إنشاء المجموعة ✓" : "Sous-groupe créé ✓");
  };

  const handleEdit = (sg) => {
    setData(d => ({ ...d, subgroups: d.subgroups.map(x => x.id === sg.id ? sg : x) }));
    setEditing(null);
    if (toastFn) toastFn(lang === "ar" ? "تم تعديل المجموعة ✓" : "Sous-groupe modifié ✓");
  };

  const handleDelete = (id) => {
    if (!window.confirm(lang === "ar" ? "هل تريد حذف هذه المجموعة وكل بياناتها؟" : "Supprimer ce sous-groupe et toutes ses données ?")) return;
    const studs = (data.students || []).filter(s => s.subgroupId === id).map(s => s.id);
    const sess  = (data.sessions || []).filter(s => s.subgroupId === id).map(s => s.id);
    setData(d => ({
      ...d,
      subgroups:   d.subgroups.filter(sg => sg.id !== id),
      students:    d.students.filter(s => s.subgroupId !== id),
      sessions:    d.sessions.filter(s => s.subgroupId !== id),
      attendances: d.attendances.filter(a => !sess.includes(a.sessionId)),
      payments:    d.payments.filter(p => p.subgroupId !== id),
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
              {cat?.label}
              {levelLabel && <span style={{ color: cat?.color, marginLeft: 8 }}>· {levelLabel}</span>}
              {groupType && <span style={{ color: C.inkSoft, fontSize: 16, marginLeft: 8 }}>· {groupType}</span>}
            </h2>
          </div>
          <p style={{ color: C.inkSoft, fontSize: 13, margin: 0 }}>
            {subgroups.length} {lang === "ar" ? "مجموعة" : "sous-groupe(s)"}
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
              <Plus size={16} /> {lang === "ar" ? "+ مجموعة" : "+ Sous-groupe"}
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
                {(data.subgroups || []).filter(sg => sg.categoryId === "langues" && sg.levelId === ll.id).length} {lang === "ar" ? "مجموعة" : "groupe(s)"}
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

      {/* ── Subgroups grid ───────────────────────────────────── */}
      {(levelId || (isLangues && levelId)) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {subgroups.map(sg => (
            <SubgroupCard
              key={sg.id}
              sg={sg} data={data}
              catColor={cat?.color} catBg={cat?.bg} catBorder={cat?.border}
              onOpen={() => onNav({ screen: "subgroup", subgroupId: sg.id })}
              onEdit={() => setEditing(sg)}
              onDelete={() => handleDelete(sg.id)}
            />
          ))}
          {subgroups.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.inkSoft }}>
              {lang === "ar" ? "لا توجد مجموعات — أنشئ مجموعة جديدة" : "Aucun sous-groupe — Créez le premier"}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      {showAdd && (
        <SubgroupFormModal
          catId={catId} levelId={levelId} groupType={groupType}
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}
      {editing && (
        <SubgroupFormModal
          catId={catId} levelId={editing.levelId} groupType={editing.groupType}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
