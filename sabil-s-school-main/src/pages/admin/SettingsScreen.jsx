import React, { useState, useRef } from "react";
import { Upload, Globe, X } from "lucide-react";
import { C, inputStyle } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import AvatarDisplay from "../../components/ui/AvatarDisplay";
import LanguageToggle from "../../components/ui/LanguageToggle";

export default function SettingsScreen({ admin, onSave, toastFn, onBack }) {
  const { t, isRTL } = useLanguage();
  const [form, setForm] = useState(admin);
  const fileInputRef = useRef(null);

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

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>{t("settingsTitle")}</h2>
        {onBack && <IconBtn icon={X} onClick={onBack} title={t("close")} />}
      </div>
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
        <Field label={t("newPasswordLabel")}><input type="password" style={inputStyle} value={form.password} onChange={e => set("password", e.target.value)} /></Field>
        <PrimaryBtn onClick={() => { onSave(form); toastFn(t("settingsSavedToast")); }}>{t("saveSettingsBtn")}</PrimaryBtn>
      </div>
    </div>
  );
}
