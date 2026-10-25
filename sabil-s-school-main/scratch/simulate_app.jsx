import React, { useState } from "react";
import ReactDOMServer from "react-dom/server";
import { loadDatabase } from "./server/dbHelpers.js";

// Setup browser globals for Node env
if (typeof globalThis.localStorage === "undefined") {
  const store = { "auth_token": "mock-admin-token" };
  globalThis.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    documentElement: { dir: "ltr", lang: "fr" },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

import { LanguageProvider } from "./src/context/LanguageContext.jsx";
import { AuthProvider } from "./src/context/AuthContext.jsx";
import FinancialScreen from "./src/pages/admin/FinancialScreen.jsx";
import AdminApp from "./src/pages/admin/AdminApp.jsx";

console.log("-----------------------------------------");
console.log("TEST 1: Render FinancialScreen directly");
console.log("-----------------------------------------");
try {
  const data = loadDatabase();
  console.log("Data loaded. academicYears count:", data.academicYears?.length);

  const html = ReactDOMServer.renderToString(
    <LanguageProvider>
      <AuthProvider>
        <FinancialScreen data={data} setData={() => {}} toastFn={() => {}} activeYearId="2025-2026" />
      </AuthProvider>
    </LanguageProvider>
  );
  console.log("✅ FinancialScreen Direct Render OK! Length:", html.length);
  console.log("HTML snippet:", html.slice(0, 400));
} catch (err) {
  console.error("❌ CRASH in Test 1 (FinancialScreen Direct):", err.stack || err);
}

console.log("\n-----------------------------------------");
console.log("TEST 2: Render AdminApp with screen = 'finance'");
console.log("-----------------------------------------");
try {
  const data = loadDatabase();
  
  // Custom wrapper component to set screen = finance
  function TestAdminWrapper() {
    return (
      <LanguageProvider>
        <AuthProvider>
          <AdminApp data={data} setData={() => {}} onLogout={() => {}} toastFn={() => {}} />
        </AuthProvider>
      </LanguageProvider>
    );
  }

  const html = ReactDOMServer.renderToString(<TestAdminWrapper />);
  console.log("✅ AdminApp Render OK! Length:", html.length);
} catch (err) {
  console.error("❌ CRASH in Test 2 (AdminApp):", err.stack || err);
}
