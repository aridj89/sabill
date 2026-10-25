import React from "react";
import ReactDOMServer from "react-dom/server";
import { loadDatabase } from "./server/dbHelpers.js";
import FinancialScreen from "./src/pages/admin/FinancialScreen.jsx";
import { LanguageProvider } from "./src/context/LanguageContext.jsx";

try {
  console.log("Loading database...");
  const data = loadDatabase();
  console.log("Database loaded.");

  console.log("Rendering FinancialScreen to string...");
  const html = ReactDOMServer.renderToString(
    <LanguageProvider>
      <FinancialScreen data={data} setData={() => {}} toastFn={() => {}} activeYearId="2025-2026" />
    </LanguageProvider>
  );

  console.log("✅ FinancialScreen Render Successful! HTML Length:", html.length);
  console.log("Snippet:", html.slice(0, 400));
} catch (err) {
  console.error("❌ CRASH RENDERING FINANCIALSCREEN:", err);
}
