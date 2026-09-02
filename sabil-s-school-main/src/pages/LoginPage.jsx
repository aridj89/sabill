import React, { useState } from "react";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/ui/LanguageToggle";
import "./LoginPage.css";

export default function LoginPage({ data, toastFn }) {
  const { login } = useAuth();
  const { t, isRTL } = useLanguage();
  
  // States for login form
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Generalized login handler based on input
  const handleLogin = () => {
    // Try to find if it's admin
    if (identifier === data.admin.username && password === data.admin.password) {
      login("admin");
      return;
    }
    
    // Try to find if it's a parent (using telephone as identifier)
    const parent = data.parents.find(pa => pa.telephone === identifier && pa.password === password);
    if (parent) {
      login("parent", parent.id);
      return;
    }
    
    // Fallback if none match
    toastFn(t("loginError"));
  };

  return (
    <div className="login-wrapper">
      <div style={{ position: "absolute", top: 20, right: isRTL ? "auto" : 20, left: isRTL ? 20 : "auto", zIndex: 10 }}>
        <LanguageToggle />
      </div>

      <div className="login-card">
        <div className="login-logo"><img src="/back.jpeg" alt={t("loginTitle")} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /></div>
        <h1>{t("loginTitle")}</h1>
        <div className="login-subtitle">{t("loginSubtitle")}</div>

        <div className="login-field">
          <label>{t("loginIdentifierLabel")}</label>
          <div className="login-input-wrap">
            <span className="login-icon"><User size={16} /></span>
            <input 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t("loginIdentifierPlaceholder")} 
            />
          </div>
        </div>

        <div className="login-field">
          <div className="login-row-between">
            <label>{t("loginPasswordLabel")}</label>
            <a href="#" className="login-forgot">{t("loginForgot")}</a>
          </div>
          <div className="login-input-wrap">
            <span className="login-icon"><Lock size={16} /></span>
            <input 
              type={showPwd ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
            <span className="login-eye" onClick={() => setShowPwd(!showPwd)}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </span>
          </div>
        </div>

        <label className="login-remember">
          <input type="checkbox" defaultChecked />
          {t("loginRemember")}
        </label>

        <button className="login-btn-primary" onClick={handleLogin}>
          {t("loginSubmit")}
        </button>

      </div>
    </div>
  );
}
