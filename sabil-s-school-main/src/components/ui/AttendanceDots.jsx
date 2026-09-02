import React from "react";
import { Check } from "lucide-react";
import { C } from "../../theme/tokens";

export default function AttendanceDots({ presences, onToggle }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {presences.map((p, i) => (
        <button key={i} onClick={onToggle ? () => onToggle(i) : undefined} title={`Séance ${i + 1}`} style={{
          width: 22, height: 22, borderRadius: 7, border: "none",
          background: p ? C.accent : "#EDEAE2", cursor: onToggle ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {p ? <Check size={13} color="#fff" strokeWidth={3} /> : <span className="f-mono" style={{ fontSize: 10, color: "#B4AFA1" }}>{i + 1}</span>}
        </button>
      ))}
    </div>
  );
}
