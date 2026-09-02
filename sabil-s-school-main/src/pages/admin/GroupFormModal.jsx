import React, { useState } from "react";
import { C, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function GroupFormModal({ filter, onClose, onSave }) {
  const { t } = useLanguage();
  const [nom, setNom] = useState("");

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

  return (
    <Modal title={t("modalNewGroup")} onClose={onClose}>
      <p style={{ fontSize: 13, color: C.inkSoft, marginTop: -6 }}>{getNiveauLabel(filter.niveau)} · {filter.annee} · {getTypeLabel(filter.type)}</p>
      <Field label={t("groupNameLabel")}><input style={inputStyle} placeholder={t("groupNamePlaceholder")} value={nom} onChange={e => setNom(e.target.value)} /></Field>
      <PrimaryBtn full onClick={() => nom && onSave({ id: uid(), ...filter, nom })}>{t("createGroupBtn")}</PrimaryBtn>
    </Modal>
  );
}
