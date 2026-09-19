/**
 * Centralized API Configuration
 * Supports Local Development, LAN Multi-PC Deployment (SERVER_IP:5000), and Cloud/Railway Hosting.
 */

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  }
  
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || "localhost";
    const protocol = window.location.protocol || "http:";
    // If port is 5173 / 5174 (Vite dev server), target port 5000 on the same host
    if (window.location.port === "5173" || window.location.port === "5174" || window.location.port === "3000") {
      return `${protocol}//${hostname}:5000`;
    }
    // If running in production bundle served directly by backend or reverse proxy
    if (!window.location.port || window.location.port === "80" || window.location.port === "443") {
      return window.location.origin;
    }
    return `${protocol}//${hostname}:5000`;
  }

  return "http://localhost:5000";
}

export function getApiUrl(path = "") {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
