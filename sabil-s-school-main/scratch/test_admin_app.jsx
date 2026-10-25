import React from "react";
import ReactDOMServer from "react-dom/server";
import { loadDatabase } from "./server/dbHelpers.js";
import AdminApp from "./src/pages/admin/AdminApp.jsx";
import { LanguageProvider } from "./src/context/LanguageContext.jsx";
import { AuthProvider } from "./src/context/AuthContext.jsx";

try {
  console.log("Loading database...");
  const data = loadDatabase();
  console.log("Database loaded.");

  console.log("Rendering AdminApp to string...");
  const html = ReactDOMServer.renderToString(
    <LanguageProvider>
      <AdminApp data={data} setData={() => {}} onLogout={() => {}} toastFn={() => {}} />
    </LanguageProvider>
  );

  console.log("✅ AdminApp Render Successful! HTML Length:", html.length);
} catch (err) {
  console.error("❌ CRASH RENDERING ADMINAPP:", err);
}
