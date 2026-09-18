// Centralized API configuration
// Supports REACT_APP_API_URL, VITE_API_URL, and auto-detects current domain origin in production
const getBaseUrl = () => {
  // 1. Injected via process.env.REACT_APP_API_URL
  if (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // 2. Vite environment variable import.meta.env.VITE_API_URL
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 3. If in browser: use current domain origin (so deployed app calls itself, not localhost:5000!)
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    const port = window.location.port;
    if (port !== "5173" && port !== "5174") {
      return window.location.origin;
    }
  }
  // 4. Local Vite dev fallback
  return "http://localhost:5000";
};

export const API_BASE_URL = getBaseUrl().replace(/\/+$/, "");

export const API_ENDPOINTS = {
  data: `${API_BASE_URL}/api/data`,
  login: `${API_BASE_URL}/api/auth/login`,
  reset: `${API_BASE_URL}/api/reset`,
  nfc: `${API_BASE_URL}/api/nfc`,
};
