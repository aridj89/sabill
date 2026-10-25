import React from "react";
import ReactDOMServer from "react-dom/server";
import { LanguageProvider } from "./src/context/LanguageContext.jsx";
import { AuthProvider } from "./src/context/AuthContext.jsx";
import App from "./src/App.jsx";

// Mock localStorage if missing in node environment
if (typeof globalThis.localStorage === "undefined") {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

try {
  console.log("Rendering Full App to string...");
  const html = ReactDOMServer.renderToString(
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  );

  console.log("✅ Full App Rendered Successfully! HTML Length:", html.length);
  console.log("Snippet:", html.slice(0, 500));
} catch (err) {
  console.error("❌ CRASH RENDERING FULL APP:", err);
}
