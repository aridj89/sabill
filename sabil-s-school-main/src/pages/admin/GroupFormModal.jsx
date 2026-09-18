import React, { useState, useEffect } from "react";
import { C, inputStyle, uid, generateSessions, DAYS_FR, DAY_SHORT, SCHOOL_CATS, CAT_BY_ID } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

const INITIAL = {
  nom: "",
  days: [],
  time: "10:00",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 9 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  sessionsPerCycle: 4,
};

export default function GroupFormModal({
  catId, levelId, levelLabel, groupType, activeYearId,    // context (where we are in hierarchy)
  initial,                       // null → create, object → edit
  onClose, onSave,
}) {
  const { t, lang } = useLanguage();
  const cat = CAT_BY_ID[catId];
  const [form, setForm] = useState(initial ? {
    nom: initial.nom,
    days: initial.days || [],
    time: initial.time || "10:00",
    startDate: initial.startDate || INITIAL.startDate,
    endDate: initial.endDate || INITIAL.endDate,
    sessionsPerCycle: initial.sessionsPerCycle || 4,
  } : { ...INITIAL });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (d) => {
    set("days", form.days.includes(d)
      ? form.days.filter(x => x !== d)
      : [...form.days, d]
    );
  };

  // Preview session count
  const previewCount = (() => {
    if (!form.startDate || !form.endDate || form.days.length === 0) return 0;
    const DAY_JS = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
    const dayNums = form.days.map(d => DAY_JS[d]);
    const start = new Date(form.startDate + "T00:00:00");
    const end = new Date(form.endDate + "T00:00:00");
    let count = 0, cur = new Date(start);
    while (cur <= end && count < 500) {
      if (dayNums.includes(cur.getDay())) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  })();

  const handleSave = () => {
    if (form.days.length === 0) return;
    const displayLevel = levelLabel || levelId;
    const autoNom = displayLevel ? `${displayLevel} - ${groupType || cat?.label}` : (cat?.label || "Groupe");
    const sg = {
      id: initial?.id || uid(),
      nom: initial?.nom || autoNom,
      categoryId: catId,
      levelId,
      groupType: groupType || null,
      academicYearId: activeYearId,
      days: form.days,
      time: form.time,
      startDate: form.startDate,
      endDate: form.endDate,
      sessionsPerCycle: Number(form.sessionsPerCycle) || 4,
      price: 0,
    };
    // Generate sessions only if new creation
    const newSessions = initial ? null : generateSessions(sg);
    onSave(sg, newSessions);
  };

  const isValid = form.days.length > 0 && form.startDate && form.endDate;

  const catColor = cat?.color || C.accent;
  const title = initial
    ? (lang === "ar" ? "تعديل المجموعة" : "Modifier le groupe")
    : (lang === "ar" ? "مجموعة جديدة" : "Nouveau groupe");

  return (
    <Modal title={title} onClose={onClose} wide>
      {/* Context badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", borderRadius: 10, background: cat?.bg || C.accentSoft, border: `1px solid ${cat?.border || C.border}` }}>
        {cat && <cat.icon size={14} color={catColor} />}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: catColor }}>
          {cat?.label} {levelId && `— ${levelId}`} {groupType && `— ${groupType}`}
        </span>
      </div>

      {/* Nom is auto-generated, no input needed */}

      {/* Jours */}
      <Field label={lang === "ar" ? "أيام الدراسة" : "Jours d'étude"}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DAYS_FR.map(d => {
            const active = form.days.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                style={{
                  padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${active ? catColor : "rgba(255,255,255,0.25)"}`,
                  background: active ? cat?.bg || C.accentSoft : "rgba(255,255,255,0.07)",
                  color: active ? "#fff" : "rgba(255,255,255,0.75)",
                  transition: "all 0.15s",
                  boxShadow: active ? `0 0 10px ${cat?.bg || "rgba(226,150,58,0.3)"}` : "none",
                }}
              >
                {DAY_SHORT[d]}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Heure + Séances */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "التوقيت" : "Heure"}>
          <input type="time" style={inputStyle} value={form.time} onChange={e => set("time", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "عدد الحصص" : "Nb de séances"}>
          <input type="number" min={1} max={20} style={inputStyle} value={form.sessionsPerCycle} onChange={e => set("sessionsPerCycle", e.target.value)} />
        </Field>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "تاريخ البداية" : "Date de début"}>
          <input type="date" style={inputStyle} value={form.startDate} onChange={e => set("startDate", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "تاريخ النهاية" : "Date de fin"}>
          <input type="date" style={inputStyle} value={form.endDate} onChange={e => set("endDate", e.target.value)} />
        </Field>
      </div>

      {/* Note: Prix est maintenant sur chaque élève */}

      {/* Preview */}
      {previewCount > 0 && (
        <div style={{ background: "rgba(226,150,58,0.1)", border: "1px solid rgba(226,150,58,0.3)", borderRadius: 10, padding: "10px 14px", marginTop: 4, fontSize: 13, color: C.inkSoft }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>{previewCount}</span>
          {" "}{lang === "ar" ? "حصة ستُنشأ تلقائياً في البرنامج" : "séances seront générées automatiquement"}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <PrimaryBtn full onClick={handleSave} disabled={!isValid}>
          {initial
            ? (lang === "ar" ? "حفظ التعديلات" : "Enregistrer les modifications")
            : (lang === "ar" ? "إنشاء المجموعة" : "Créer le groupe")}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
