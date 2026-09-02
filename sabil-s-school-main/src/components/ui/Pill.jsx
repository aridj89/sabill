import React from "react";
import { BadgeCheck, BadgeX } from "lucide-react";
import { C } from "../../theme/tokens";

export default function Pill({ good, children, onClick }) {
  return (
    <button onClick={onClick} className="f-body" style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
      border: "none", background: good ? C.goodSoft : C.badSoft, color: good ? C.good : C.bad,
      cursor: onClick ? "pointer" : "default",
    }}>
      {good ? <BadgeCheck size={14} /> : <BadgeX size={14} />}
      {children}
    </button>
  );
}
