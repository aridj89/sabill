import { BookOpen, School, Landmark } from "lucide-react";

/* ---------------------------------------------------------------
   DESIGN TOKENS (Glassmorphism & Brown Theme)
--------------------------------------------------------------- */
export const C = {
  bg: "transparent",
  /* même style que le burger sidebar panel */
  surface: "linear-gradient(160deg, rgba(22,18,71,0.88) 0%, rgba(71,48,18,0.82) 55%, rgba(18,68,71,0.88) 100%)",
  border: "rgba(255,255,255,0.22)",
  ink: "#FFFFFF",
  inkSoft: "rgba(255,255,255,0.62)",
  accent: "#E2963A",
  accentSoft: "rgba(226,150,58,0.2)",
  good: "#4ade80",
  goodSoft: "rgba(74,222,128,0.2)",
  bad: "#f87171",
  badSoft: "rgba(248,113,113,0.2)",
  navy: "linear-gradient(135deg, #161247, #473012, #124447)",
  navySoft: "rgba(226,150,58,0.13)",
  /* style complet pour les panneaux avec backdropFilter */
  glassStyle: {
    background: "linear-gradient(160deg, rgba(22,18,71,0.88) 0%, rgba(71,48,18,0.82) 55%, rgba(18,68,71,0.88) 100%)",
    backdropFilter: "blur(20px) saturate(1.4)",
    WebkitBackdropFilter: "blur(20px) saturate(1.4)",
    border: "1px solid rgba(255,255,255,0.22)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
};

export const NIVEAUX = {
  "Primaire": ["1ère", "2ème", "3ème", "4ème", "5ème"],
  "CEM": ["1ère", "2ème", "3ème", "4ème"],
  "Lycée": ["1ère", "2ème", "3ème"],
};

export const NIVEAU_ICON = { "Primaire": BookOpen, "CEM": School, "Lycée": Landmark };

export const TYPES = ["Normal", "Spécial", "Individuel"];

export const AVATAR_EMOJIS = ["🧑‍🏫", "👩‍🏫", "🧑‍💼", "👨‍💻", "🦉", "📘"];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 14.5,
  color: C.ink,
  outline: "none",
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(4px)",
};
