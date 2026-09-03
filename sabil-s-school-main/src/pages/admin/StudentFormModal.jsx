import React, { useState } from "react";
import { C, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function StudentFormModal({ subgroupId, initial, enrollmentFee, onClose, onSave }) {
  const { t, lang } = useLanguage();
  const isEdit = !!initial;

  const [form, setForm] = useState(initial ? {
    nom: initial.nom,
    prenom: initial.prenom,
    phone: initial.phone || "",
    password: initial.password || "",
    nfcCardId: initial.nfcCardId || "",
    enrollmentPaid: initial.enrollmentPaid,
    enrollmentDate: initial.enrollmentDate || new Date().toISOString().slice(0, 10),
  } : {
    nom: "",
    prenom: "",
    phone: "",
    password: uid().slice(0, 6), // auto-générer un mot de passe à 6 caractères
    nfcCardId: "",
    enrollmentPaid: false,
    enrollmentDate: new Date().toISOString().slice(0, 10),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.nom.trim() || !form.prenom.trim() || !form.phone.trim()) return;
    const student = {
      id: initial?.id || uid(),
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      phone: form.phone.trim(),
      password: form.password,
      nfcCardId: (form.nfcCardId || "").trim(),
      subgroupId: subgroupId ?? initial?.subgroupId,
      enrollmentPaid: form.enrollmentPaid,
      enrollmentDate: form.enrollmentDate,
    };
    onSave(student);
  };

  const isValid = form.nom.trim() && form.prenom.trim() && form.phone.trim();

  return (
    <Modal
      title={isEdit
        ? (lang === "ar" ? "تعديل بيانات التلميذ" : "Modifier l'élève")
        : (lang === "ar" ? "إضافة تلميذ جديد" : "Ajouter un élève")
      }
      onClose={onClose}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "اللقب" : "Nom"}>
          <input autoFocus style={inputStyle} placeholder="Kaci" value={form.nom} onChange={e => set("nom", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "الاسم" : "Prénom"}>
          <input style={inputStyle} placeholder="Yasmine" value={form.prenom} onChange={e => set("prenom", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "رقم الهاتف (معرف الدخول)" : "Téléphone (Identifiant)"}>
          <input style={inputStyle} placeholder="0550112233" value={form.phone} onChange={e => set("phone", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "كلمة المرور المؤقتة" : "Mot de passe généré"}>
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 2, paddingRight: 40 }} readOnly value={form.password} />
            <button
              onClick={() => set("password", uid().slice(0, 6))}
              style={{ position: "absolute", right: 6, top: 6, bottom: 6, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: C.inkSoft, cursor: "pointer", padding: "0 8px", fontSize: 12, fontWeight: 700 }}
              title={lang === "ar" ? "توليد كلمة مرور جديدة" : "Générer un nouveau mot de passe"}
            >
              ↻
            </button>
          </div>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "تاريخ التسجيل" : "Date d'inscription"}>
          <input type="date" style={inputStyle} value={form.enrollmentDate} onChange={e => set("enrollmentDate", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "بطاقة NFC / الرمز (UID)" : "Puce / Carte NFC"}>
          <input style={inputStyle} placeholder="UID: 04A1B2..." value={form.nfcCardId} onChange={e => set("nfcCardId", e.target.value)} />
        </Field>
      </div>

      {/* Frais d'inscription */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: form.enrollmentPaid ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)", border: `1px solid ${form.enrollmentPaid ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.3)"}`, marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
            {lang === "ar" ? "رسوم التسجيل" : "Frais d'inscription"}
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 800, color: C.accent }}>
              {enrollmentFee || 500} DA
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
            {form.enrollmentPaid
              ? (lang === "ar" ? "مدفوعة ✓" : "Payés ✓")
              : (lang === "ar" ? "غير مدفوعة" : "Non payés")
            }
          </div>
        </div>
        <button
          type="button"
          onClick={() => set("enrollmentPaid", !form.enrollmentPaid)}
          style={{
            padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: "none",
            background: form.enrollmentPaid ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)",
            color: form.enrollmentPaid ? "#4ade80" : "#fbbf24",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {form.enrollmentPaid
            ? (lang === "ar" ? "تحديد كغير مدفوع" : "Marquer impayé")
            : (lang === "ar" ? "تحديد كمدفوع" : "Marquer payé")
          }
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <PrimaryBtn full onClick={handleSave} disabled={!isValid}>
          {isEdit
            ? (lang === "ar" ? "حفظ التعديلات" : "Enregistrer")
            : (lang === "ar" ? "إضافة التلميذ" : "Ajouter l'élève")}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
