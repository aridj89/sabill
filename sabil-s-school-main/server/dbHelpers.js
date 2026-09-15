import { db } from "./db.js";
import { hashPasswordSync } from "./utils/password.js";

// ─── loadDatabase ─────────────────────────────────────────────
// Reconstruit le même objet JSON qu'avant pour garder
// la compatibilité totale avec le frontend React.
export function loadDatabase() {
  const adminRow = db.prepare("SELECT * FROM admin WHERE id = 1").get();
  const settingsRows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const r of settingsRows) {
    const num = Number(r.value);
    settings[r.key] = isNaN(num) ? r.value : num;
  }

  const subgroups = db.prepare("SELECT * FROM subgroups").all().map(sg => ({
    ...sg,
    days: JSON.parse(sg.days || "[]"),
    price: Number(sg.price),
    sessionsPerCycle: Number(sg.sessionsPerCycle),
  }));

  const students = db.prepare("SELECT * FROM students").all().map(st => ({
    ...st,
    enrollmentPaid: !!st.enrollmentPaid,
  }));

  const sessions = db.prepare("SELECT * FROM sessions").all();

  const attendances = db.prepare("SELECT * FROM attendances").all().map(a => ({
    ...a,
    present: !!a.present,
    nfcVerified: !!a.nfcVerified,
  }));

  const payments = db.prepare("SELECT data_json FROM payments").all()
    .map(r => JSON.parse(r.data_json));

  const parents = db.prepare("SELECT * FROM parents").all().map(p => {
    const extra = JSON.parse(p.data_json || "{}");
    return { id: p.id, nom: p.nom, telephone: p.telephone, password: p.password, ...extra };
  });

  const extraSessions = db.prepare("SELECT data_json FROM extra_sessions").all()
    .map(r => JSON.parse(r.data_json));

  const userNotifications = db.prepare("SELECT * FROM user_notifications").all().map(n => ({
    ...n,
    meta: JSON.parse(n.meta || "{}"),
    read: !!n.read,
  }));

  const subgroupMessages = db.prepare("SELECT data_json FROM subgroup_messages").all()
    .map(r => JSON.parse(r.data_json));

  const privateMessages = db.prepare("SELECT data_json FROM private_messages").all()
    .map(r => JSON.parse(r.data_json));

  const messages = db.prepare("SELECT data_json FROM messages").all()
    .map(r => JSON.parse(r.data_json));

  const notifications = db.prepare("SELECT data_json FROM notifications").all()
    .map(r => JSON.parse(r.data_json));

  const commCategories = db.prepare("SELECT * FROM comm_categories").all();

  const commGroups = db.prepare("SELECT data_json FROM comm_groups").all()
    .map(r => JSON.parse(r.data_json));

  const commMessages = db.prepare("SELECT data_json FROM comm_messages").all()
    .map(r => JSON.parse(r.data_json));

  const groups = db.prepare("SELECT data_json FROM groups_table").all()
    .map(r => JSON.parse(r.data_json));

  const langLevels = db.prepare("SELECT * FROM lang_levels").all();

  return {
    admin: adminRow ? {
      nom: adminRow.nom,
      prenom: adminRow.prenom,
      username: adminRow.username,
      password: adminRow.password,
      avatar: adminRow.avatar,
    } : null,
    settings,
    langLevels,
    subgroups,
    students,
    sessions,
    attendances,
    payments,
    parents,
    extraSessions,
    userNotifications,
    subgroupMessages,
    privateMessages,
    messages,
    notifications,
    commCategories,
    commGroups,
    commMessages,
    groups,
  };
}

// ─── saveDatabase ─────────────────────────────────────────────
// Reçoit le même objet JSON qu'avant et le persiste dans SQLite.
export function saveDatabase(data) {
  try {
    const run = db.transaction(() => {
      // Admin
      if (data.admin) {
        db.prepare(`INSERT OR REPLACE INTO admin (id, nom, prenom, username, password, avatar)
                    VALUES (1, ?, ?, ?, ?, ?)`)
          .run(data.admin.nom, data.admin.prenom, data.admin.username,
               data.admin.password, data.admin.avatar || "🧑‍🏫");
      }

      // Settings
      if (data.settings && typeof data.settings === "object") {
        for (const [k, v] of Object.entries(data.settings)) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(k, String(v));
        }
      }

      // Lang levels
      if (Array.isArray(data.langLevels)) {
        db.prepare("DELETE FROM lang_levels").run();
        for (const ll of data.langLevels) {
          db.prepare("INSERT OR IGNORE INTO lang_levels (id, nom) VALUES (?, ?)").run(ll.id, ll.nom);
        }
      }

      // Subgroups
      if (Array.isArray(data.subgroups)) {
        db.prepare("DELETE FROM subgroups").run();
        for (const sg of data.subgroups) {
          db.prepare(`INSERT INTO subgroups (id, nom, categoryId, levelId, groupType, days, time, startDate, endDate, sessionsPerCycle, price)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(sg.id, sg.nom, sg.categoryId || null, sg.levelId || null,
                 sg.groupType || "Normal", JSON.stringify(sg.days || []),
                 sg.time || null, sg.startDate || null, sg.endDate || null,
                 sg.sessionsPerCycle || 4, sg.price || 0);
        }
      }

      // Students
      if (Array.isArray(data.students)) {
        db.prepare("DELETE FROM students").run();
        for (const st of data.students) {
          const pw = st.password
            ? (st.password.startsWith("$2") ? st.password : hashPasswordSync(st.password))
            : hashPasswordSync("000000");
          db.prepare(`INSERT INTO students (id, nom, prenom, phone, password, subgroupId, nfcCardId, enrollmentPaid, enrollmentDate, lastModified, createdAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(st.id, st.nom, st.prenom, st.phone || null, pw,
                 st.subgroupId || null, st.nfcCardId || "",
                 st.enrollmentPaid ? 1 : 0, st.enrollmentDate || null,
                 st.lastModified || null, st.createdAt || null);
        }
      }

      // Sessions
      if (Array.isArray(data.sessions)) {
        db.prepare("DELETE FROM sessions").run();
        for (const s of data.sessions) {
          db.prepare(`INSERT INTO sessions (id, subgroupId, date, time, status, note)
                      VALUES (?, ?, ?, ?, ?, ?)`)
            .run(s.id, s.subgroupId, s.date, s.time || "00:00", s.status || "planned", s.note || "");
        }
      }

      // Attendances
      if (Array.isArray(data.attendances)) {
        db.prepare("DELETE FROM attendances").run();
        for (const a of data.attendances) {
          db.prepare(`INSERT INTO attendances (id, sessionId, studentId, present, date, time, nfcVerified)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(a.id, a.sessionId || null, a.studentId, a.present ? 1 : 0,
                 a.date || null, a.time || null, a.nfcVerified ? 1 : 0);
        }
      }

      // Payments
      if (Array.isArray(data.payments)) {
        db.prepare("DELETE FROM payments").run();
        for (const p of data.payments) {
          db.prepare("INSERT INTO payments (id, data_json) VALUES (?, ?)").run(p.id, JSON.stringify(p));
        }
      }

      // Parents
      if (Array.isArray(data.parents)) {
        db.prepare("DELETE FROM parents").run();
        for (const p of data.parents) {
          const pw = p.password
            ? (p.password.startsWith("$2") ? p.password : hashPasswordSync(p.password))
            : hashPasswordSync("000000");
          const { password: _pw, ...rest } = p;
          db.prepare(`INSERT INTO parents (id, nom, telephone, password, data_json)
                      VALUES (?, ?, ?, ?, ?)`)
            .run(p.id, p.nom || "", p.telephone || null, pw, JSON.stringify(rest));
        }
      }

      // Extra sessions
      if (Array.isArray(data.extraSessions)) {
        db.prepare("DELETE FROM extra_sessions").run();
        for (const es of data.extraSessions) {
          db.prepare("INSERT INTO extra_sessions (id, data_json) VALUES (?, ?)").run(es.id, JSON.stringify(es));
        }
      }

      // User notifications
      if (Array.isArray(data.userNotifications)) {
        db.prepare("DELETE FROM user_notifications").run();
        for (const n of data.userNotifications) {
          db.prepare(`INSERT INTO user_notifications (id, userId, type, title, message, meta, date, time, read)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(n.id, n.userId, n.type || "info", n.title || "", n.message || "",
                 JSON.stringify(n.meta || {}), n.date || null, n.time || null, n.read ? 1 : 0);
        }
      }

      // Generic blob tables
      const blobMap = [
        ["subgroup_messages", data.subgroupMessages],
        ["private_messages",  data.privateMessages],
        ["messages",          data.messages],
        ["notifications",     data.notifications],
        ["comm_groups",       data.commGroups],
        ["comm_messages",     data.commMessages],
        ["groups_table",      data.groups],
      ];
      for (const [table, arr] of blobMap) {
        if (Array.isArray(arr)) {
          db.prepare(`DELETE FROM ${table}`).run();
          for (const item of arr) {
            db.prepare(`INSERT INTO ${table} (id, data_json) VALUES (?, ?)`).run(item.id, JSON.stringify(item));
          }
        }
      }

      // Comm categories
      if (Array.isArray(data.commCategories)) {
        db.prepare("DELETE FROM comm_categories").run();
        for (const cat of data.commCategories) {
          db.prepare("INSERT INTO comm_categories (id, nom) VALUES (?, ?)").run(cat.id, cat.nom);
        }
      }
    });
    run();
    return true;
  } catch (err) {
    console.error("❌ Erreur saveDatabase SQLite:", err);
    return false;
  }
}
