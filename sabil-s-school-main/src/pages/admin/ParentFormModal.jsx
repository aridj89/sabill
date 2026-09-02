import React, { useState } from "react";
import { inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function ParentFormModal({ data, initial, onClose, onSave }) {
  const { t } = useLanguage();
  const [nom, setNom] = useState(initial?.nom || "");
  const [tel, setTel] = useState(initial?.telephone || "");
  const [pass, setPass] = useState(initial?.password || Math.random().toString(36).slice(2, 8));
  const [studentId, setStudentId] = useState(initial?.studentId || data.students[0]?.id || "");
  return (
    <Modal title={initial ? t("modalEditParent") : t("modalNewParent")} onClose={onClose}>
      <Field label={t("parentFullNameLabel")}><input style={inputStyle} value={nom} onChange={e => setNom(e.target.value)} /></Field>
      <Field label={t("phoneLabel")}><input style={inputStyle} value={tel} onChange={e => setTel(e.target.value)} /></Field>
      <Field label={t("passwordLabel")}><input style={inputStyle} value={pass} onChange={e => setPass(e.target.value)} /></Field>
      <Field label={t("linkStudentLabel")}>
        <select style={inputStyle} value={studentId} onChange={e => setStudentId(e.target.value)}>
          {data.students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
        </select>
      </Field>
      <PrimaryBtn full onClick={() => nom && tel && onSave({ id: initial?.id || uid(), nom, telephone: tel, password: pass, studentId })}>
        {initial ? t("save") : t("confirm")}
      </PrimaryBtn>
    </Modal>
  );
}
