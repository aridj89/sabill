import React from "react";
import { C } from "../../theme/tokens";

export default function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="f-body" style={{
        display: "block", fontSize: 12.5, fontWeight: 700, color: C.inkSoft,
        marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4,
      }}>{label}</label>
      {children}
    </div>
  );
}
