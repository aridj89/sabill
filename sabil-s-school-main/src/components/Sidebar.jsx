import React, { useState } from "react";
import { X, ChevronRight, MessageCircle } from "lucide-react";
import { C, NIVEAUX, NIVEAU_ICON, TYPES } from "../theme/tokens";
import { useLanguage } from "../context/LanguageContext";

export default function Sidebar({ open, onClose, onSelect, activeFilter, onNavigateChat }) {
  const { t, lang, isRTL } = useLanguage();
  const [openNiveau, setOpenNiveau] = useState(activeFilter?.niveau || "Lycée");

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
    <>
      {/* ── Overlay ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          backdropFilter: open ? "blur(12px) brightness(0.55)" : "blur(0px) brightness(1)",
          WebkitBackdropFilter: open ? "blur(12px) brightness(0.55)" : "blur(0px) brightness(1)",
          background: open ? "rgba(10,8,30,0.45)" : "transparent",
          transition: "backdrop-filter .35s ease, background .35s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* ── Sidebar panel ── */}
      <div
        className="f-body"
        style={{
          position: "fixed",
          top: 65,
          left: isRTL ? "auto" : 18,
          right: isRTL ? 18 : "auto",
          width: 320,
          maxHeight: "calc(100vh - 100px)",
          zIndex: 95,
          overflowY: "auto",
          padding: "20px 20px 60px",
          borderRadius: "24px 24px 120px 120px",
          background: "linear-gradient(160deg, rgba(22,18,71,0.88) 0%, rgba(71,48,18,0.82) 55%, rgba(18,68,71,0.88) 100%)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
          transform: open ? "translateX(0)" : (isRTL ? "translateX(360px)" : "translateX(-360px)"),
          opacity: open ? 1 : 0,
          transition: "transform .32s cubic-bezier(.22,1,.36,1), opacity .25s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3
            className="f-display"
            style={{ margin: 0, fontSize: 20, color: "#fff", letterSpacing: "0.01em" }}
          >
            {t("categories")}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(6px)",
              borderRadius: 999,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.85)",
              padding: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Communication Link */}
        <button
          onClick={() => {
            if (onNavigateChat) onNavigateChat();
            onClose();
          }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)", color: "#fff",
            fontSize: 14.5, fontWeight: 700, marginBottom: 16, cursor: "pointer",
            transition: "background .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          <MessageCircle size={18} color={C.accent} />
          {t("messagesNav")}
        </button>

        {/* Niveau list */}
        {Object.entries(NIVEAUX).map(([niveau, annees]) => {
          const Icon = NIVEAU_ICON[niveau];
          const isOpen = openNiveau === niveau;
          return (
            <div key={niveau} style={{ marginBottom: 6 }}>
              <button
                onClick={() => setOpenNiveau(isOpen ? null : niveau)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 13px",
                  borderRadius: 14,
                  border: isOpen ? "1px solid rgba(226,150,58,0.45)" : "1px solid rgba(255,255,255,0.1)",
                  background: isOpen
                    ? "linear-gradient(135deg, rgba(226,150,58,0.22), rgba(226,150,58,0.08))"
                    : "rgba(255,255,255,0.06)",
                  fontWeight: 700,
                  color: "#fff",
                  fontSize: 14.5,
                  boxShadow: isOpen ? "0 0 12px rgba(226,150,58,0.15)" : "none",
                  transition: "all .2s ease",
                }}
              >
                <Icon size={17} color={C.accent} />
                {getNiveauLabel(niveau)}
                <ChevronRight
                  size={15}
                  color="rgba(255,255,255,0.55)"
                  style={{
                    marginLeft: isRTL ? 0 : "auto",
                    marginRight: isRTL ? "auto" : 0,
                    transform: isOpen ? "rotate(90deg)" : (isRTL ? "rotate(180deg)" : "none"),
                    transition: "transform .2s",
                  }}
                />
              </button>

              {isOpen && (
                <div style={{ paddingLeft: isRTL ? 0 : 12, paddingRight: isRTL ? 12 : 0, marginTop: 6 }}>
                  {TYPES.map(type => (
                    <div key={type} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.5)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          margin: "10px 0 6px",
                        }}
                      >
                        {getNiveauLabel(niveau)} — {getTypeLabel(type)}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {annees.map(annee => {
                          const active =
                            activeFilter &&
                            activeFilter.niveau === niveau &&
                            activeFilter.annee === annee &&
                            activeFilter.type === type;
                          return (
                            <button
                              key={annee}
                              onClick={() => { onSelect({ niveau, annee, type }); onClose(); }}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 999,
                                border: `1.5px solid ${active ? C.accent : "rgba(255,255,255,0.25)"}`,
                                background: active
                                  ? "linear-gradient(135deg, rgba(226,150,58,0.45), rgba(226,150,58,0.2))"
                                  : "rgba(255,255,255,0.08)",
                                color: active ? "#fff" : "rgba(255,255,255,0.82)",
                                fontSize: 12.5,
                                fontWeight: 600,
                                boxShadow: active ? "0 0 10px rgba(226,150,58,0.3)" : "none",
                                transition: "all .18s ease",
                              }}
                            >
                              {annee}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
