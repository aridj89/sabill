import React, { useState, useEffect, useRef } from "react";
import { Search, Users, BookOpen, User, X, Settings, Calendar, PieChart, MessageCircle, LayoutDashboard, LayoutTemplate } from "lucide-react";
import { C, CAT_BY_ID } from "../theme/tokens";
import { useLanguage } from "../context/LanguageContext";

/**
 * GlobalSearch – connects the navbar search bar to real data.
 * Searches across: students, subgroups, parents.
 * Calls onNav(navState) to navigate to the result.
 */
export default function GlobalSearch({ data, onNav }) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // ── Close on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Search logic ────────────────────────────────────────────
  const q = query.trim().toLowerCase();

  const results = q.length < 2 ? [] : (() => {
    const items = [];

    // Students
    (data.students || []).forEach(st => {
      const name = `${st.prenom} ${st.nom}`.toLowerCase();
      const phone = (st.phone || "").toLowerCase();
      const code = (st.studentCode || "").toLowerCase();
      if (name.includes(q) || phone.includes(q) || code.includes(q)) {
        const sg = data.subgroups?.find(s => s.id === st.subgroupId);
        const cat = sg ? CAT_BY_ID[sg.categoryId] : null;
        items.push({
          type: "student",
          id: st.id,
          label: `${st.prenom} ${st.nom}`,
          sub: (st.studentCode ? `${st.studentCode} · ` : '') + (sg ? sg.nom : (lang === "ar" ? "بدون فوج" : "Sans groupe")),
          color: cat?.color || C.accent,
          navState: { screen: "student", studentId: st.id },
        });
      }
    });

    // Subgroups
    (data.subgroups || []).forEach(sg => {
      const name = (sg.nom || "").toLowerCase();
      if (name.includes(q)) {
        const cat = CAT_BY_ID[sg.categoryId];
        const stCount = (data.students || []).filter(s => s.subgroupId === sg.id).length;
        items.push({
          type: "group",
          id: sg.id,
          label: sg.nom,
          sub: `${stCount} ${lang === "ar" ? "تلميذ" : "élèves"} · ${sg.price || 0} DA`,
          color: cat?.color || C.accent,
          navState: { screen: "subgroup", subgroupId: sg.id },
        });
      }
    });

    // Parents
    (data.parents || []).forEach(p => {
      const name = `${p.prenom || ""} ${p.nom || ""}`.toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      if (name.includes(q) || phone.includes(q)) {
        items.push({
          type: "parent",
          id: p.id,
          label: `${p.prenom || ""} ${p.nom || ""}`,
          sub: p.phone || (lang === "ar" ? "ولي الأمر" : "Parent"),
          color: "#f472b6",
          navState: { screen: "parents" },
        });
      }
    });

    // Screens & General Navigation
    const screens = [
      { id: "dashboard", navState: { screen: "dashboard" }, keywords: ["dashboard", "accueil", "الرئيسية", "statistiques", "احصائيات"], label: lang === "ar" ? "لوحة القيادة" : "Tableau de bord", sub: lang === "ar" ? "نظرة عامة" : "Vue d'ensemble", icon: LayoutDashboard, color: "#a855f7" },
      { id: "finance", navState: { screen: "finance" }, keywords: ["finance", "argent", "revenus", "مالية", "مداخيل", "دفع"], label: lang === "ar" ? "المالية والدفع" : "Finance & Paiement", sub: lang === "ar" ? "إدارة المداخيل" : "Gestion des revenus", icon: PieChart, color: "#10b981" },
      { id: "calendar", navState: { screen: "calendar" }, keywords: ["calendar", "calendrier", "emploi", "جدول", "توقيت", "رزنامة"], label: lang === "ar" ? "الجدول الزمني" : "Calendrier", sub: lang === "ar" ? "إدارة الحصص" : "Gestion des séances", icon: Calendar, color: "#3b82f6" },
      { id: "chat", navState: { screen: "chat" }, keywords: ["chat", "messages", "communication", "رسائل", "دردشة", "تواصل"], label: lang === "ar" ? "الرسائل" : "Messagerie", sub: lang === "ar" ? "تواصل مع الأولياء" : "Communication", icon: MessageCircle, color: "#ec4899" },
      { id: "settings", navState: { screen: "settings" }, keywords: ["settings", "paramètres", "اعدادات", "إعدادات", "configuration"], label: lang === "ar" ? "الإعدادات" : "Paramètres", sub: lang === "ar" ? "تفضيلات النظام" : "Configuration du système", icon: Settings, color: "#f59e0b" },
      { id: "parents", navState: { screen: "parents" }, keywords: ["comptes", "étudiants", "students", "طلاب", "حسابات", "accounts"], label: lang === "ar" ? "حسابات الطلاب" : "Comptes Étudiants", sub: lang === "ar" ? "إدارة حسابات التلاميذ" : "Gestion des comptes", icon: Users, color: "#f472b6" },
    ];
    
    screens.forEach(scr => {
      if (scr.keywords.some(k => k.includes(q) || q.includes(k))) {
        items.push({
          type: "screen", id: scr.id, label: scr.label, sub: scr.sub, color: scr.color, navState: scr.navState, customIcon: scr.icon
        });
      }
    });

    // Categories (Primaire, CEM, etc)
    Object.values(CAT_BY_ID || {}).forEach(cat => {
      const nameFr = (cat.label || "").toLowerCase();
      const nameAr = (cat.labelAr || "").toLowerCase();
      if (nameFr.includes(q) || nameAr.includes(q)) {
        items.push({
          type: "category", id: cat.id, label: lang === "ar" ? cat.labelAr : cat.label,
          sub: lang === "ar" ? "قسم تعليمي" : "Section d'enseignement", color: cat.color || C.accent,
          navState: { screen: "structure", catId: cat.id }, customIcon: cat.icon || LayoutTemplate
        });
      }
    });

    return items.slice(0, 12);
  })();

  const typeIcon = (type) => {
    if (type === "student") return User;
    if (type === "group")   return BookOpen;
    if (type === "screen")  return LayoutDashboard;
    if (type === "category") return LayoutTemplate;
    return Users;
  };

  const typeLabel = (type) => {
    if (type === "student") return lang === "ar" ? "تلميذ" : "Élève";
    if (type === "group")   return lang === "ar" ? "فوج" : "Groupe";
    if (type === "screen")  return lang === "ar" ? "صفحة" : "Page";
    if (type === "category") return lang === "ar" ? "قسم" : "Section";
    return lang === "ar" ? "ولي الأمر" : "Parent";
  };

  const handleSelect = (item) => {
    onNav(item.navState);
    setQuery("");
    setOpen(false);
  };

  const isRTL = lang === "ar";

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, maxWidth: 340 }}>
      {/* ── Input ─────────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 40, display: "flex", alignItems: "center" }}>
        <Search
          size={16}
          color={C.inkSoft}
          style={{
            position: "absolute",
            left: isRTL ? "auto" : 12,
            right: isRTL ? 12 : "auto",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={lang === "ar" ? "بحث عن تلميذ، فوج، ولي أمر…" : "Rechercher élève, groupe, parent…"}
          style={{
            width: "100%",
            height: 40,
            borderRadius: 12,
            border: `1px solid ${open && query ? C.accent : C.border}`,
            fontSize: 13.5,
            color: C.ink,
            outline: "none",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(4px)",
            paddingLeft: isRTL ? 12 : 36,
            paddingRight: isRTL ? 36 : query ? 36 : 12,
            transition: "border-color 0.2s ease",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            style={{
              position: "absolute",
              right: isRTL ? "auto" : 10,
              left: isRTL ? 10 : "auto",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.inkSoft,
              padding: 2,
              display: "flex",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Dropdown ──────────────────────────────────────────── */}
      {open && q.length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 500,
            background: "linear-gradient(160deg, rgba(22,18,71,0.98) 0%, rgba(45,30,12,0.97) 55%, rgba(18,50,60,0.98) 100%)",
            backdropFilter: "blur(24px) saturate(1.4)",
            border: `1px solid rgba(255,255,255,0.22)`,
            borderRadius: 18,
            boxShadow: "0 24px 48px rgba(0,0,0,0.65)",
            overflow: "hidden",
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: C.inkSoft, fontSize: 13 }}>
              {lang === "ar" ? "لا توجد نتائج" : "Aucun résultat trouvé"}
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {/* Group results by type */}
              {["screen", "category", "student", "group", "parent"].map(type => {
                const typed = results.filter(r => r.type === type);
                if (typed.length === 0) return null;
                const TypeIcon = typeIcon(type);
                return (
                  <div key={type}>
                    {/* Section header */}
                    <div style={{
                      padding: "8px 14px 4px",
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.38)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}>
                      {typeLabel(type)}
                    </div>
                    {typed.map(item => {
                      const Icon = item.customIcon || typeIcon(item.type);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            cursor: "pointer",
                            transition: "background 0.12s ease",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${item.color}25`,
                            border: `1px solid ${item.color}45`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Icon size={16} color={item.color} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 1 }}>
                              {item.sub}
                            </div>
                          </div>
                          <div style={{
                            marginLeft: "auto",
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: item.color,
                            background: `${item.color}18`,
                            border: `1px solid ${item.color}35`,
                            padding: "2px 8px",
                            borderRadius: 6,
                            whiteSpace: "nowrap",
                          }}>
                            {typeLabel(item.type)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
