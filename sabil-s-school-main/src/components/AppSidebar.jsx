import React, { useState } from "react";
import {
  X, ChevronRight, ChevronDown,
  MessageCircle, LayoutDashboard, Calendar, Landmark,
  Users, Settings, BookOpen, Languages, GraduationCap, Radio,
} from "lucide-react";
import { C, SCHOOL_CATS, CAT_BY_ID } from "../theme/tokens";
import { useLanguage } from "../context/LanguageContext";

/**
 * AppSidebar — navigation hiérarchique
 * Props:
 *   open          : boolean
 *   onClose       : fn
 *   nav           : { screen, catId, levelId, groupType, subgroupId }
 *   onNav         : fn(navState)
 *   data          : full data object (pour langLevels)
 */
export default function AppSidebar({ open, onClose, nav, onNav, data }) {
  const { t, lang } = useLanguage();
  const [openCats, setOpenCats] = useState({ primaire: true });
  const [openLevels, setOpenLevels] = useState({});

  const langLevels = data?.langLevels || [];

  const toggleCat   = id => setOpenCats(p   => ({ ...p, [id]: !p[id] }));
  const toggleLevel = key => setOpenLevels(p => ({ ...p, [key]: !p[key] }));

  const go = (navState) => { onNav(navState); onClose(); };

  const isActive = (screen, extra = {}) => {
    if (nav.screen !== screen) return false;
    return Object.entries(extra).every(([k, v]) => nav[k] === v);
  };

  // ── Style helpers ────────────────────────────────────────────
  const itemStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "9px 12px", borderRadius: 12,
    border: active ? "1px solid rgba(226,150,58,0.45)" : "1px solid transparent",
    background: active ? "rgba(226,150,58,0.15)" : "transparent",
    color: active ? "#fff" : "rgba(255,255,255,0.8)",
    fontSize: 13.5, fontWeight: active ? 700 : 500,
    cursor: "pointer", transition: "all 0.15s ease",
    marginBottom: 2, width: "100%", textAlign: "left",
  });

  const sectionLabel = (txt) => (
    <div style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "14px 12px 6px", marginTop: 4 }}>
      {txt}
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 90,
          backdropFilter: open ? "blur(12px) brightness(0.55)" : "blur(0px)",
          WebkitBackdropFilter: open ? "blur(12px) brightness(0.55)" : "blur(0px)",
          background: open ? "rgba(10,8,30,0.45)" : "transparent",
          transition: "all .35s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Panel */}
      <div
        className="f-body"
        style={{
          position: "fixed",
          top: 65, left: 18,
          width: 300,
          maxWidth: "calc(100vw - 28px)",
          maxHeight: "calc(100vh - 100px)",
          zIndex: 95,
          overflowY: "auto",
          padding: "16px 14px 60px",
          borderRadius: "24px 24px 120px 120px",
          background: "linear-gradient(160deg,rgba(22,18,71,0.96) 0%,rgba(71,48,18,0.92) 55%,rgba(18,68,71,0.96) 100%)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.12)",
          transform: open ? "translateX(0)" : "translateX(-360px)",
          opacity: open ? 1 : 0,
          transition: "transform .32s cubic-bezier(.22,1,.36,1), opacity .25s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="f-display" style={{ margin: 0, fontSize: 18, color: "#fff" }}>
            {lang === "ar" ? "التنقل" : "Navigation"}
          </h3>
          <button onClick={onClose} style={{
            border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)",
            borderRadius: 999, width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.85)", padding: 0,
          }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Quick links ─────────────────────────────────────────── */}
        {sectionLabel(lang === "ar" ? "الرئيسية" : "Accès rapide")}

        <button style={itemStyle(isActive("dashboard"))} onClick={() => go({ screen: "dashboard" })}>
          <LayoutDashboard size={16} color={C.accent} />
          {lang === "ar" ? "لوحة القيادة" : "Tableau de bord"}
        </button>

        <button style={itemStyle(isActive("finance"))} onClick={() => go({ screen: "finance" })}>
          <Landmark size={16} color={C.accent} />
          {t("financeNav")}
        </button>

        <button style={itemStyle(isActive("nfc"))} onClick={() => go({ screen: "nfc" })}>
          <Radio size={16} color="#4ade80" />
          {lang === "ar" ? "تسجيل الحضور (NFC)" : "Pointage NFC"}
        </button>

        <button style={itemStyle(isActive("calendar"))} onClick={() => go({ screen: "calendar" })}>
          <Calendar size={16} color={C.accent} />
          {lang === "ar" ? "الجدول الزمني" : "Calendrier global"}
        </button>

        {/* ── Structure scolaire ──────────────────────────────────── */}
        {sectionLabel(lang === "ar" ? "الهيكل التعليمي" : "Structure scolaire")}

        {SCHOOL_CATS.map(cat => {
          const isCatOpen = !!openCats[cat.id];
          const Icon = cat.icon;

          return (
            <div key={cat.id} style={{ marginBottom: 3 }}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.id)}
                style={{
                  ...itemStyle(false),
                  borderColor: isCatOpen ? cat.border : "transparent",
                  background: isCatOpen ? cat.bg : "transparent",
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.bg, border: `1px solid ${cat.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} color={cat.color} />
                </div>
                <span style={{ flex: 1, color: isCatOpen ? "#fff" : "rgba(255,255,255,0.8)", fontWeight: isCatOpen ? 700 : 500 }}>
                  {cat.label}
                </span>
                {isCatOpen
                  ? <ChevronDown size={13} color="rgba(255,255,255,0.5)" />
                  : <ChevronRight size={13} color="rgba(255,255,255,0.5)" />
                }
              </button>

              {/* Levels */}
              {isCatOpen && (
                <div style={{ paddingLeft: 10, marginTop: 2 }}>
                  {/* Langues : niveaux dynamiques */}
                  {cat.id === "langues" ? (
                    <>
                      {langLevels.length === 0 ? (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "6px 10px", fontStyle: "italic" }}>
                          {lang === "ar" ? "لا توجد مستويات" : "Aucun niveau"}
                        </div>
                      ) : (
                        langLevels.map(ll => (
                          <button
                            key={ll.id}
                            onClick={() => go({ screen: "structure", catId: "langues", levelId: ll.id, groupType: null })}
                            style={{
                              ...itemStyle(isActive("structure", { catId: "langues", levelId: ll.id })),
                              paddingLeft: 10,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: 999, background: cat.color, flexShrink: 0 }} />
                            {ll.nom}
                          </button>
                        ))
                      )}
                    </>
                  ) : (
                    /* Primaire / CEM / Lycée : niveaux + types */
                    cat.levels.map(level => {
                      const levelKey = `${cat.id}-${level}`;
                      const isLevelOpen = !!openLevels[levelKey];
                      return (
                        <div key={level} style={{ marginBottom: 2 }}>
                          <button
                            onClick={() => toggleLevel(levelKey)}
                            style={{ ...itemStyle(false), paddingLeft: 10, fontSize: 13 }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: 999, background: cat.color, flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{level} {cat.label === "Primaire" ? "année" : cat.label === "CEM" ? "CEM" : "lycée"}</span>
                            {isLevelOpen
                              ? <ChevronDown size={11} color="rgba(255,255,255,0.45)" />
                              : <ChevronRight size={11} color="rgba(255,255,255,0.45)" />
                            }
                          </button>
                          {isLevelOpen && (
                            <div style={{ paddingLeft: 14 }}>
                              {cat.groups.map(gType => (
                                <button
                                  key={gType}
                                  onClick={() => go({ screen: "structure", catId: cat.id, levelId: level, groupType: gType })}
                                  style={{
                                    ...itemStyle(isActive("structure", { catId: cat.id, levelId: level, groupType: gType })),
                                    fontSize: 12.5, paddingLeft: 8,
                                  }}
                                >
                                  <span style={{ width: 4, height: 4, borderRadius: 999, background: cat.color, opacity: 0.7, flexShrink: 0 }} />
                                  {gType}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Other links ─────────────────────────────────────────── */}
        {sectionLabel(lang === "ar" ? "أقسام أخرى" : "Autres")}

        <button style={itemStyle(isActive("parents"))} onClick={() => go({ screen: "parents" })}>
          <GraduationCap size={16} color={C.accent} />
          {t("parentsList")}
        </button>

        <button style={itemStyle(isActive("chat"))} onClick={() => go({ screen: "chat" })}>
          <MessageCircle size={16} color={C.accent} />
          {t("messagesNav")}
        </button>

        <button style={itemStyle(isActive("settings"))} onClick={() => go({ screen: "settings" })}>
          <Settings size={16} color={C.accent} />
          {t("settingsNav")}
        </button>
      </div>
    </>
  );
}
