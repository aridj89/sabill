import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPasswordSync } from "./password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_FILE = path.join(__dirname, "..", "database.json");

export const INITIAL_DATA = {
  admin: {
    nom: "Bensalem",
    prenom: "Karim",
    username: "admin",
    password: "admin1234",
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
  commCategories: [{ id: "cat1comm", nom: "Langue Française" }],
  commGroups: [],
  commMessages: [],
  groups: [],
};

export function sanitizeAndHashDatabase(data) {
  if (data.admin && data.admin.password) {
    data.admin.password = hashPasswordSync(data.admin.password);
  }
  if (Array.isArray(data.students)) {
    data.students.forEach(st => {
      if (st.password) {
        st.password = hashPasswordSync(st.password);
      }
    });
  }
  if (Array.isArray(data.parents)) {
    data.parents.forEach(p => {
      if (p.password) {
        p.password = hashPasswordSync(p.password);
      }
    });
  }
  return data;
}

export function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const sanitized = sanitizeAndHashDatabase(parsed);
      saveDatabase(sanitized);
      return sanitized;
    }
  } catch (err) {
    console.error("Erreur de lecture du fichier database.json:", err);
  }
  const clean = sanitizeAndHashDatabase(INITIAL_DATA);
  saveDatabase(clean);
  return clean;
}

export function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Erreur d'écriture dans database.json:", err);
    return false;
  }
}
