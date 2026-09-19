import { uid } from "../theme/tokens";
import { getApiUrl, getAuthHeaders } from "../config/api";

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
   STORAGE & API SYNC (WITH DYNAMIC API & JWT HEADER)
--------------------------------------------------------------- */
const STORAGE_KEY = "ecole-data-v4";

// Clear outdated local storage keys if present
try {
  localStorage.removeItem("ecole-data-v3");
  localStorage.removeItem("ecole-data-v2");
  localStorage.removeItem("ecole-data-v1");
  localStorage.removeItem("ecole-data");
} catch {}

export async function fetchCleanData() {
  try {
    const res = await fetch(getApiUrl("/api/data"), { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn("Express backend unreachable, using cached state fallback:", err);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return defaultData();
}

export function loadDataFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultData();
}

export async function persistData(data) {
  // Save locally as temporary offline cache
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}

  // Sync to central school.db via Express backend
  try {
    const res = await fetch(getApiUrl("/api/data"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.warn("Backend failed to save data, status:", res.status);
    }
  } catch (err) {
    console.warn("Failed to persist data to central Express backend:", err);
  }
}

export async function resetData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    await fetch(getApiUrl("/api/reset"), {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {}
  return defaultData();
}

