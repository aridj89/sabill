import { uid } from "../theme/tokens";

const API_URL = "http://localhost:5000/api/data";

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
    ],
    subgroups: [],
    students: [],
    sessions: [],
    attendances: [],
    payments: [],
    subgroupMessages: [],
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
const STORAGE_KEY = "ecole-data-v3";

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
    await fetch("http://localhost:5000/api/reset", {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {}
  return defaultData();
}
