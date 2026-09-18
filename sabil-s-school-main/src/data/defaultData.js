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
   STORAGE & API SYNC (WITH PERSISTENCE PROTECTION)
--------------------------------------------------------------- */
const STORAGE_KEY = "ecole-data-v4";

export async function fetchCleanData() {
  let serverData = null;
  try {
    const res = await fetch(API_URL, { headers: getAuthHeaders() });
    if (res.ok) {
      serverData = await res.json();
    }
  } catch (err) {
    console.warn("Express backend unreachable, loading from localStorage fallback:", err);
  }

  let localData = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localData = JSON.parse(raw);
  } catch {}

  const serverHasData = serverData && (
    (serverData.students && serverData.students.length > 0) ||
    (serverData.groups && serverData.groups.length > 0) ||
    (serverData.payments && serverData.payments.length > 0)
  );

  const localHasData = localData && (
    (localData.students && localData.students.length > 0) ||
    (localData.groups && localData.groups.length > 0) ||
    (localData.payments && localData.payments.length > 0)
  );

  // 1. If server has actual data, cache it locally and return it
  if (serverHasData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
    } catch {}
    return serverData;
  }

  // 2. If server is empty (e.g. after a new commit deploy on Render / ephemeral container reset),
  // but client has existing local data: PRESERVE local data and re-sync it to the server!
  if (!serverHasData && localHasData) {
    console.log("🔄 Re-syncing local data to cloud server database...");
    persistData(localData);
    return localData;
  }

  // 3. If server returned an initial state and local is empty
  if (serverData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
    } catch {}
    return serverData;
  }

  if (localData) return localData;

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
  if (!data) return;
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
