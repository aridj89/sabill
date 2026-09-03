import React from "react";
import { X } from "lucide-react";
import { C } from "../../theme/tokens";

export default function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "12px",
      backdropFilter: "blur(14px) brightness(0.5)",
      WebkitBackdropFilter: "blur(14px) brightness(0.5)",
      background: "rgba(10,8,30,0.5)",
      boxSizing: "border-box",
    }} onClick={onClose}>
      <div className="f-body modal-card-content" onClick={e => e.stopPropagation()} style={{
        ...C.glassStyle,
        borderRadius: 20,
        width: "100%",
        maxWidth: wide ? 520 : 420,
        padding: 24,
        maxHeight: "88vh",
        overflowY: "auto",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="f-display" style={{ margin: 0, fontSize: 20, color: C.ink, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(6px)",
            borderRadius: 999, width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.85)", padding: 0,
          }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

