import { uid } from "../theme/tokens";

export function defaultData() {
  const g1 = uid(), g2 = uid(), g3 = uid();
  const s1 = uid(), s2 = uid(), s3 = uid(), s4 = uid();

  return {
    admin: {
      nom: "Bensalem",
      prenom: "Karim",
      username: "admin",
      password: "admin1234",
      avatar: "🧑‍🏫",
    },
    groups: [
      { id: g1, niveau: "Lycée", annee: "2ème", type: "Normal", nom: "Groupe A" },
      { id: g2, niveau: "Lycée", annee: "2ème", type: "Spécial", nom: "Groupe Spécial 1" },
      { id: g3, niveau: "CEM", annee: "1ère", type: "Individuel", nom: "Élève Individuel" },
    ],
    students: [
      { id: s1, nom: "Kaci", prenom: "Yasmine", age: 16, groupId: g1, presences: [true, true, false, true], paye: true },
      { id: s2, nom: "Meziane", prenom: "Amine", age: 16, groupId: g1, presences: [true, true, true, true], paye: false },
      { id: s3, nom: "Boudiaf", prenom: "Rania", age: 17, groupId: g2, presences: [true, false, true, true], paye: true },
      { id: s4, nom: "Haddad", prenom: "Sofiane", age: 14, groupId: g3, presences: [true, true, true, false], paye: true },
    ],
    parents: [
      { id: uid(), nom: "Kaci Mourad", telephone: "0550112233", password: "1234", studentId: s1 },
      { id: uid(), nom: "Meziane Farida", telephone: "0661223344", password: "1234", studentId: s2 },
    ],
    messages: [],
    notifications: [],
    extraSessions: [],
  };
}

const STORAGE_KEY = "ecole-data";

export function loadDataFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* not found yet */
  }
  const d = defaultData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch (e) {}
  return d;
}

export function persistData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}
