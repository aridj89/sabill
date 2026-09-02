import React, { useState } from "react";
import { C, inputStyle, NIVEAUX, TYPES, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function AddSessionModal({ onClose, onAdd }) {
  const { t, isRTL } = useLanguage();
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [all, setAll] = useState(true);
  const [niveau, setNiveau] = useState("Lycée");
  const [annee, setAnnee] = useState(NIVEAUX["Lycée"][0]);
  const [type, setType] = useState("Normal");

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

  const submit = () => {
    if (!date || !heure) return;
    onAdd({ id: uid(), date, heure, cible: all ? t("allGroups") : `${getNiveauLabel(niveau)} ${annee} — ${getTypeLabel(type)}` });
    onClose();
  };
  return (
    <Modal title={t("modalAddSession")} onClose={onClose}>
      <Field label={t("sessionDateLabel")}><input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label={isRTL ? "توقيت الحصة" : "Heure"}><input type="time" style={inputStyle} value={heure} onChange={e => setHeure(e.target.value)} /></Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: C.ink, margin: "6px 0 14px" }}>
        <input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> {isRTL ? "تطبيق على جميع الأقسام" : "Appliquer à toutes les catégories"}
      </label>
      {!all && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
          <Field label={t("levelLabel")}>
            <select style={inputStyle} value={niveau} onChange={e => { setNiveau(e.target.value); setAnnee(NIVEAUX[e.target.value][0]); }}>
              {Object.keys(NIVEAUX).map(n => <option key={n} value={n}>{getNiveauLabel(n)}</option>)}
            </select>
          </Field>
          <Field label={t("yearLabel")}>
            <select style={inputStyle} value={annee} onChange={e => setAnnee(e.target.value)}>
              {NIVEAUX[niveau].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label={t("typeLabel")}>
            <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
              {TYPES.map(tp => <option key={tp} value={tp}>{getTypeLabel(tp)}</option>)}
            </select>
          </Field>
        </div>
      )}
      <PrimaryBtn full onClick={submit}>{t("modalAddSession")}</PrimaryBtn>
    </Modal>
  );
}
