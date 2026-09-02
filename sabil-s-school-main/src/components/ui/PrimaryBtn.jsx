import React from "react";
import { C } from "../../theme/tokens";

export default function PrimaryBtn({ children, onClick, full, danger, type = "button" }) {
  return (
    <button type={type} onClick={onClick} className="f-body" style={{
      width: full ? "100%" : "auto", padding: "11px 18px", borderRadius: 12, border: "none",
      background: danger ? C.bad : C.navy, color: "#fff", fontWeight: 700, fontSize: 14.5,
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}>{children}</button>
  );
}
