import React, { useState } from "react";
import { inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function StudentFormModal({ groupId, onClose, onSave }) {
  const { t } = useLanguage();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [age, setAge] = useState("");

  return (
    <Modal title={t("modalNewStudent")} onClose={onClose}>
      <Field label={t("studentLastNameLabel")}><input style={inputStyle} value={nom} onChange={e => setNom(e.target.value)} /></Field>
      <Field label={t("studentFirstNameLabel")}><input style={inputStyle} value={prenom} onChange={e => setPrenom(e.target.value)} /></Field>
      <Field label={t("studentAgeLabel")}><input type="number" style={inputStyle} value={age} onChange={e => setAge(e.target.value)} /></Field>
      <PrimaryBtn full onClick={() => nom && prenom && onSave({
        id: uid(), nom, prenom, age: Number(age) || 0, groupId, presences: [false, false, false, false], paye: false,
      })}>{t("modalNewStudent")}</PrimaryBtn>
    </Modal>
  );
}
