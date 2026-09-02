import React from "react";
import { C } from "../../theme/tokens";

export default function IconBtn({ icon: Icon, onClick, active, badge, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: 12,
        border: active ? "1.5px solid rgba(226,150,58,0.8)" : "1px solid rgba(255,255,255,0.22)",
        background: active
          ? "linear-gradient(135deg, rgba(226,150,58,0.35), rgba(226,150,58,0.15))"
          : "rgba(255,255,255,0.08)",
        color: active ? C.accent : "rgba(255,255,255,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: active ? `0 0 14px rgba(226,150,58,0.35)` : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "all .18s ease",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = "rgba(226,150,58,0.18)";
          e.currentTarget.style.border = "1px solid rgba(226,150,58,0.55)";
          e.currentTarget.style.boxShadow = "0 0 12px rgba(226,150,58,0.25)";
          e.currentTarget.style.color = C.accent;
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.22)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
          e.currentTarget.style.color = "rgba(255,255,255,0.88)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      <Icon size={18} strokeWidth={2} />
      {badge > 0 && (
        <span className="f-mono" style={{
          position: "absolute", top: -3, right: -3,
          background: C.accent, color: "#fff",
          fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
          boxShadow: "0 2px 6px rgba(226,150,58,0.6)",
        }}>{badge}</span>
      )}
    </button>
  );
}
