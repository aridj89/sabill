import React, { useState } from "react";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/ui/LanguageToggle";
import "./LoginPage.css";

export default function LoginPage({ data, setData, toastFn }) {
  const { login } = useAuth();
  const { t, isRTL } = useLanguage();
  
  // States for login form
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Generalized login handler using Express REST API
  const handleLogin = async () => {
    const cleanId = identifier.trim();
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanId, password }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        const id = resData.role === "student" ? resData.studentId : resData.role === "parent" ? resData.parentId : null;
        login(resData.role, id, resData.token);
        return;
      }

      toastFn(resData.message || t("loginError"));
    } catch (err) {
      console.warn("Express backend error during login, falling back to local verification:", err);
      
      // Fallback local check
      if (identifier === data.admin.username && password === data.admin.password) {
        login("admin");
        return;
      }
      const parent = (data.parents || []).find(pa => pa.telephone === identifier && pa.password === password);
      if (parent) {
        login("parent", parent.id);
        return;
      }
      const student = (data.students || []).find(st => st.phone === identifier && st.password === password);
      if (student) {
        // Update lastLogin date + send welcome notification
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        if (setData) {
          setData(d => ({
            ...d,
            students: (d.students || []).map(s =>
              s.id === student.id ? { ...s, lastLogin: now.toISOString() } : s
            ),
            userNotifications: [
              ...(d.userNotifications || []),
              {
                id: Math.random().toString(36).slice(2, 10),
                userId: student.id,
                type: "info",
                title: "مرحباً بعودتك 👋",
                message: `تم تسجيل دخولك بتاريخ ${dateStr} الساعة ${timeStr}. إذا لم تكن أنت، قم بتغيير كلمة مرورك فوراً.`,
                date: dateStr,
                time: timeStr,
                read: false,
              }
            ]
          }));
        }
        login("student", student.id);
        return;
      }
      toastFn(t("loginError"));
    }
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
