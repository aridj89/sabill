import React from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function LanguageToggle({ style = {} }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.22)",
        borderRadius: 999,
        padding: "3px",
        gap: 3,
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setLang("fr")}
        style={{
          border: "none",
          cursor: "pointer",
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: lang === "fr" ? "linear-gradient(135deg, #E2963A, #C87A24)" : "transparent",
          color: lang === "fr" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
          boxShadow: lang === "fr" ? "0 2px 8px rgba(226, 150, 58, 0.4)" : "none",
          transition: "all 0.2s ease",
        }}
      >
        FR
      </button>

      <button
        type="button"
        onClick={() => setLang("ar")}
        style={{
          border: "none",
          cursor: "pointer",
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: lang === "ar" ? "linear-gradient(135deg, #E2963A, #C87A24)" : "transparent",
          color: lang === "ar" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
          boxShadow: lang === "ar" ? "0 2px 8px rgba(226, 150, 58, 0.4)" : "none",
          transition: "all 0.2s ease",
          fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
        }}
      >
        عربي
      </button>
    </div>
  );
}
