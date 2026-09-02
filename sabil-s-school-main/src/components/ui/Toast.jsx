import React from "react";
import { Bell } from "lucide-react";
import { C } from "../../theme/tokens";

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="f-body" style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200,
      ...C.glassStyle, color: "#ffffff", padding: "12px 20px", borderRadius: 14, fontSize: 14,
      fontWeight: 600, boxShadow: "0 14px 35px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
      display: "flex", alignItems: "center", gap: 10,
      maxWidth: "90vw",
    }}>
      <Bell size={16} color={C.accent} />
      <span style={{ color: "#ffffff" }}>{toast}</span>
    </div>
  );
}
