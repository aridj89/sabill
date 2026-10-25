import React from "react";
import * as LucideIcons from "lucide-react";
import * as Tokens from "./src/theme/tokens.js";
import * as LanguageContext from "./src/context/LanguageContext.jsx";
import Modal from "./src/components/ui/Modal.jsx";
import PrimaryBtn from "./src/components/ui/PrimaryBtn.jsx";

console.log("Checking Lucide Icons:");
const iconsToCheck = [
  "Landmark", "Calendar", "Users", "TrendingUp", "AlertCircle",
  "CheckCircle2", "ChevronDown", "DollarSign", "Clock", "BarChart2",
  "Filter", "Search", "Edit2", "Save", "X", "Plus", "History", "ShieldCheck", "RefreshCw"
];
for (const icon of iconsToCheck) {
  if (!LucideIcons[icon]) console.error(`❌ Lucide icon is undefined: ${icon}`);
}

console.log("Checking Tokens:", Object.keys(Tokens));
console.log("Checking Modal:", typeof Modal);
console.log("Checking PrimaryBtn:", typeof PrimaryBtn);
