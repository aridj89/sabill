import { API_ENDPOINTS } from "../config/api";
import { uid } from "../theme/tokens";

const API_URL = API_ENDPOINTS.data;

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ---------------------------------------------------------------
   DEFAULT DATA  —  Base de données vierge (Clean initial state)
--------------------------------------------------------------- */
export function defaultData() {
  return {
    admin: {
      nom: "Bensalem",
      prenom: "Karim",
      username: "admin",
      avatar: "🧑‍🏫",
    },
    settings: {
      enrollmentFee: 500,
    },
    langLevels: [
      { id: "ll1", nom: "A1" },
      { id: "ll2", nom: "A2" },
      { id: "ll3", nom: "B1" },
      { id: "ll4", nom: "B2" },
      { id: "ll5", nom: "C1" },
      { id: "ll6", nom: "C2" },
    ],
    students: [],
    sessions: [],
    attendances: [],
    payments: [],
    privateMessages: [],
    userNotifications: [],
    parents: [],
    messages: [],
    notifications: [],
    extraSessions: [],
    extraSessionPayments: [],
    commCategories: [{ id: "cat1comm", nom: "Langue Française" }],
    commGroups: [],
    commMessages: [],
    groups: [],
  };
}

/* ---------------------------------------------------------------
   STORAGE & API SYNC (WITH JWT HEADER)
--------------------------------------------------------------- */
const STORAGE_KEY = "ecole-data-v4";

// Evict legacy cached test data immediately
try {
  localStorage.removeItem("ecole-data-v3");
  localStorage.removeItem("ecole-data-v2");
  localStorage.removeItem("ecole-data-v1");
  localStorage.removeItem("ecole-data");
} catch {}

export async function fetchCleanData() {
  try {
    const res = await fetch(API_URL, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn("Express backend unreachable, loading from localStorage fallback:", err);
  }

  // Fallback to localStorage if API unavailable
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const d = defaultData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {}
  return d;
}

export function loadDataFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultData();
}

export async function persistData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn("Failed to persist data to Express backend:", err);
  }
}

export async function resetData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    await fetch(API_ENDPOINTS.reset, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {}
  return defaultData();
}
