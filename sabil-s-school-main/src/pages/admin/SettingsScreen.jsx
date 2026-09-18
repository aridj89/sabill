import React, { useState, useRef } from "react";
import { Upload, Globe, X } from "lucide-react";
import { C, inputStyle, getStudentFinancialSummary, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import AvatarDisplay from "../../components/ui/AvatarDisplay";
import LanguageToggle from "../../components/ui/LanguageToggle";

export default function SettingsScreen({ admin, data, setData, onSave, toastFn, onBack }) {
  const { t, isRTL, lang } = useLanguage();
  const [form, setForm] = useState(admin);
  const fileInputRef = useRef(null);

  // Rollover state
  const [newYearName, setNewYearName] = useState("");
  const [rolloverPreview, setRolloverPreview] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        set("avatar", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const currentYear = (data.academicYears || []).find(y => y.isCurrent) || (data.academicYears || [])[0];

  const handlePreviewRollover = () => {
    if (!newYearName.trim()) return;
    if (!currentYear) return toastFn("No current year found.");
    
    const previewDebts = [];
    let totalDebt = 0;
    
    data.students.forEach(st => {
      const fin = getStudentFinancialSummary(data, st.id, currentYear.id);
      if (fin.totalUnpaid > 0) {
        previewDebts.push({ student: st, amount: fin.totalUnpaid });
        totalDebt += fin.totalUnpaid;
      }
    });
    
    setRolloverPreview({ newYearName, debts: previewDebts, totalDebt });
  };

  const handleConfirmRollover = () => {
    if (!rolloverPreview) return;
    
    const existingYear = (data.academicYears || []).find(y => y.name === rolloverPreview.newYearName);
    const newYearId = existingYear ? existingYear.id : uid();
    const newYear = { id: newYearId, name: rolloverPreview.newYearName, isCurrent: true, startDate: new Date().toISOString().slice(0, 10), endDate: "" };
    
    // Duplicate Groups
    const oldGroups = (data.groups || []).filter(g => g.academicYearId === currentYear.id);
    let allGroups = [...(data.groups || [])];
    
    if (!existingYear) {
      const duplicatedGroups = oldGroups.map(g => ({
        ...g,
        id: uid(),
        academicYearId: newYearId
      }));
      allGroups = [...allGroups, ...duplicatedGroups];
    }
    
    // Idempotent Carry Overs
    let allCarryOvers = [...(data.debtCarryOvers || [])];
    
    const newCarryOvers = rolloverPreview.debts.map(d => {
      const existing = allCarryOvers.find(co => co.studentId === d.student.id && co.fromYearId === currentYear.id && co.toYearId === newYearId);
      if (existing) {
        existing.amount = d.amount;
        existing.updatedAt = new Date().toISOString();
        return null; // Already updated in-place
      }
      return {
        id: uid(),
        studentId: d.student.id,
        fromYearId: currentYear.id,
        toYearId: newYearId,
        amount: d.amount,
        createdAt: new Date().toISOString()
      };
    }).filter(Boolean);

    allCarryOvers = [...allCarryOvers, ...newCarryOvers];

    setData(d => ({
      ...d,
      academicYears: existingYear 
        ? d.academicYears.map(y => y.id === existingYear.id ? { ...y, isCurrent: true } : { ...y, isCurrent: false })
        : [...(d.academicYears || []).map(y => ({...y, isCurrent: false})), newYear],
      groups: allGroups,
      debtCarryOvers: allCarryOvers
    }));

    setRolloverPreview(null);
    setNewYearName("");
    toastFn(lang === "ar" ? "تم إنشاء السنة ونقل الديون والمجموعات بنجاح!" : "Nouvelle année créée, dettes et groupes transférés!");
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>{t("settingsTitle")}</h2>
        {onBack && <IconBtn icon={X} onClick={onBack} title={t("close")} />}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, alignItems: "start" }}>
        {/* Left Column: Admin Settings */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22 }}>
          {/* ── Avatar preview large ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22, padding: "14px 16px", borderRadius: 14, background: "rgba(226,150,58,0.08)", border: "1px solid rgba(226,150,58,0.2)" }}>
            <AvatarDisplay avatar={form.avatar} size={70} />
            <div>
              <div className="f-display" style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>
                {form.prenom || (isRTL ? "الاسم" : "Prénom")} {form.nom || (isRTL ? "اللقب" : "Nom")}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                @{form.username || "username"}
              </div>
            </div>
          </div>

          {/* ── Language Preference ── */}
          <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={18} color={C.accent} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{t("languagePreference")}</span>
            </div>
            <LanguageToggle />
          </div>

          {/* ── Photo / Avatar picker ── */}
          <div style={{ marginBottom: 16 }}>
            <label className="f-body" style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", display: "block", marginBottom: 8 }}>{t("avatarLabel")}</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              
              {/* Upload Button */}
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                onChange={handleImageUpload}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 16px", borderRadius: 12,
                  border: "1.5px dashed rgba(226,150,58,0.5)",
                  background: "rgba(226,150,58,0.1)",
                  color: C.accent, fontWeight: 600, fontSize: 13.5,
                  transition: "all .2s ease"
                }}
              >
                <Upload size={16} /> {isRTL ? "رفع صورة شخصية" : "Importer une image"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("lastNameLabel")}><input style={inputStyle} value={form.nom} onChange={e => set("nom", e.target.value)} /></Field>
            <Field label={t("firstNameLabel")}><input style={inputStyle} value={form.prenom} onChange={e => set("prenom", e.target.value)} /></Field>
          </div>
          <Field label={t("usernameLabel")}><input style={inputStyle} value={form.username} onChange={e => set("username", e.target.value)} /></Field>
          <Field label={t("newPasswordLabel")}><input type="password" style={inputStyle} value={form.password || ""} onChange={e => set("password", e.target.value)} /></Field>
          <PrimaryBtn onClick={() => { onSave(form); toastFn(t("settingsSavedToast")); }}>{t("saveSettingsBtn")}</PrimaryBtn>
        </div>


      </div>
    </div>
  );
}
