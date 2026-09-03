import { uid } from "../theme/tokens";

/**
 * Moteur de notifications automatique.
 * Ces fonctions doivent être appelées AVANT de sauvegarder les données avec setData,
 * elles reçoivent l'état "data" actuel, ajoutent les notifications, et retournent la nouvelle liste de notifications.
 */

function createNotification(userId, type, title, message, meta = {}) {
  return {
    id: uid(),
    userId,
    type, // 'info', 'payment', 'presence', 'session', 'message'
    title,
    message,
    meta, // { screen, studentId, subgroupId, parentId }
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    read: false,
  };
}

/**
 * Notifie tous les élèves d'un sous-groupe qu'une séance supplémentaire a été ajoutée.
 */
export function notifyExtraSessionAdded(data, subgroupId, extraSession, lang = "ar") {
  const students = (data.students || []).filter(s => s.subgroupId === subgroupId);
  if (students.length === 0) return data.userNotifications || [];

  const dateFormatted = extraSession.date;
  const timeFormatted = extraSession.time;
  const noteText = extraSession.note ? extraSession.note.trim() : "";

  const title = lang === "ar" ? "حصة إضافية جديدة 📅" : "Nouvelle séance supplémentaire 📅";
  const message = lang === "ar"
    ? `تمت برمجة حصة إضافية جديدة يوم ${dateFormatted} على الساعة ${timeFormatted}.${noteText ? ` الموضوع: ${noteText}` : ""}`
    : `Une séance supplémentaire a été programmée le ${dateFormatted} à ${timeFormatted}.${noteText ? ` Sujet : ${noteText}` : ""}`;

  const newNotifs = students.map(st => createNotification(
    st.id,
    "session",
    title,
    message,
    { screen: "calendar", subgroupId, date: extraSession.date, time: extraSession.time }
  ));

  return [...(data.userNotifications || []), ...newNotifs];
}

/**
 * Notifie tous les élèves d'un sous-groupe qu'une séance a été ajoutée/modifiée/annulée.
 */
export function notifySessionChange(data, subgroupId, actionType, sessionDetails, lang = "ar") {
  const students = (data.students || []).filter(s => s.subgroupId === subgroupId);
  if (students.length === 0) return data.userNotifications || [];

  let title = "";
  let message = "";

  if (actionType === "added") {
    title = lang === "ar" ? "حصة جديدة مبرمجة 📅" : "Nouvelle séance programmée 📅";
    message = lang === "ar"
      ? `أضاف الأستاذ حصة جديدة يوم ${sessionDetails.date} على الساعة ${sessionDetails.time}.`
      : `Une séance a été ajoutée le ${sessionDetails.date} à ${sessionDetails.time}.`;
  } else if (actionType === "modified") {
    title = lang === "ar" ? "تعديل في توقيت الحصة ⏰" : "Séance modifiée ⏰";
    message = lang === "ar"
      ? `تم تعديل الحصة لتصبح يوم ${sessionDetails.date} على الساعة ${sessionDetails.time}.`
      : `La séance a été modifiée : ${sessionDetails.date} à ${sessionDetails.time}.`;
  } else if (actionType === "cancelled") {
    title = lang === "ar" ? "إلغاء حصة ⚠️" : "Séance annulée ⚠️";
    message = lang === "ar"
      ? `تم إلغاء الحصة المقررة يوم ${sessionDetails.date} على الساعة ${sessionDetails.time}.`
      : `La séance prévue le ${sessionDetails.date} à ${sessionDetails.time} a été annulée.`;
  } else {
    return data.userNotifications || [];
  }

  const newNotifs = students.map(st => createNotification(
    st.id,
    "session",
    title,
    message,
    { screen: "calendar", subgroupId, date: sessionDetails.date, time: sessionDetails.time }
  ));
  return [...(data.userNotifications || []), ...newNotifs];
}

/**
 * Notifie un élève d'un changement de présence (marqué absent).
 */
export function notifyPresenceChange(data, studentId, sessionDate, isPresent) {
  if (isPresent) return data.userNotifications; // On ne notifie que les absences par défaut

  const title = "Avis d'absence";
  const message = `Vous avez été marqué absent à la séance du ${sessionDate}.`;
  const notif = createNotification(studentId, "presence", title, message);

  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie un élève d'un paiement effectué avec succès (inscription ou mensualité/cycle).
 */
export function notifyPaymentReceived(data, studentId, amount, details = {}, lang = "ar") {
  const { type = "course", subgroupId = null, month = "", cycleNum = null } = details;
  const sg = subgroupId ? (data.subgroups || []).find(s => s.id === subgroupId) : null;
  const sgName = sg ? sg.nom : "";

  let title = "";
  let message = "";

  if (type === "enrollment") {
    title = lang === "ar" ? "تأكيد تسديد حقوق التسجيل 🧾" : "Reçu de paiement d'inscription 🧾";
    message = lang === "ar"
      ? `تم استلام وتسجيل دفع حقوق التسجيل بمبلغ ${amount} دج بنجاح. شكراً لك!`
      : `Le règlement de vos frais d'inscription d'un montant de ${amount} DA a bien été enregistré. Merci !`;
  } else {
    const period = cycleNum ? (lang === "ar" ? `(دفعة #${cycleNum})` : `(Paiement #${cycleNum})`) : (month ? `(شهر ${month})` : "");
    title = lang === "ar" ? "تأكيد استلام الدفع 💳" : "Reçu de paiement de cours 💳";
    message = lang === "ar"
      ? `تم تأكيد دفع مستحقات الدروس ${sgName ? `(فوج ${sgName}) ` : ""}${period} بمبلغ ${amount} دج. حسابك محيّن ومستوفى.`
      : `Le paiement de vos cours ${sgName ? `(${sgName}) ` : ""}${period} d'un montant de ${amount} DA a été validé avec succès.`;
  }

  const notif = createNotification(studentId, "payment", title, message, {
    screen: "payments",
    amount,
    type,
    subgroupId,
  });

  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie un élève d'une mise à jour de son compte (infos, groupe, etc.).
 */
export function notifyAccountUpdated(data, studentId, summary = "", lang = "ar") {
  const title = lang === "ar" ? "تحديث في بيانات حسابك 🔄" : "Compte mis à jour 🔄";
  const message = summary || (lang === "ar"
    ? "تم تحديث معلومات حسابك من قبل الإدارة."
    : "Les informations de votre compte ont été mises à jour par l'administration.");

  const notif = createNotification(studentId, "info", title, message, { screen: "dashboard" });
  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie un élève d'un paiement en attente.
 */
export function notifyPaymentRequired(data, studentId, amount, reason, customMessage = "") {
  const student = (data.students || []).find(s => s.id === studentId);
  const studentName = student ? (student.nom || student.prenom) : "";
  const title = "Rappel de paiement";
  let message = customMessage;

  if (!message) {
    let feeLabel = "d'inscription";
    if (reason && reason !== "enrollment" && reason !== "d'inscription") {
      feeLabel = String(reason).startsWith("de ") || String(reason).startsWith("d'") ? reason : `de ${reason}`;
    }
    const greeting = studentName ? `Bonjour ${studentName}, ` : "Bonjour, ";
    message = `${greeting}nous vous rappelons que vos frais ${feeLabel} d'un montant de ${amount} DA sont en attente. Merci de régler votre situation au plus vite.`;
  }

  const notif = createNotification(studentId, "payment", title, message, { screen: "payments" });
  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie les élèves d'un nouveau message de l'admin dans un groupe.
 */
export function notifyGroupMessage(data, subgroupId) {
  const students = data.students.filter(s => s.subgroupId === subgroupId);
  const newNotifs = students.map(st => createNotification(st.id, "info", "Nouveau message", "Le professeur a envoyé un nouveau message dans le groupe.", { screen: "chat", tab: "group" }));
  return [...(data.userNotifications || []), ...newNotifs];
}

/**
 * Notifie l'admin d'un nouveau message privé d'un élève.
 */
export function notifyAdminPrivateMessage(data, studentId, studentName, messageText = "") {
  const preview = messageText ? ` : "${messageText.length > 55 ? messageText.slice(0, 55) + '…' : messageText}"` : "";
  const notif = createNotification(
    "admin",
    "message",
    "Nouveau message privé",
    `${studentName}${preview}`,
    { screen: "chat", section: "private", studentId }
  );
  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie l'admin d'un message envoyé par un élève dans un groupe.
 */
export function notifyAdminSubgroupMessage(data, subgroupId, subgroupName, studentName, messageText = "") {
  const preview = messageText ? ` : "${messageText.length > 55 ? messageText.slice(0, 55) + '…' : messageText}"` : "";
  const notif = createNotification(
    "admin",
    "message",
    `Message dans ${subgroupName}`,
    `${studentName}${preview}`,
    { screen: "chat", section: "groups", subgroupId }
  );
  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie l'admin d'un nouveau message envoyé par un parent.
 */
export function notifyAdminParentMessage(data, parentId, parentName, messageText = "") {
  const preview = messageText ? ` : "${messageText.length > 55 ? messageText.slice(0, 55) + '…' : messageText}"` : "";
  const notif = createNotification(
    "admin",
    "message",
    "Message d'un parent",
    `${parentName}${preview}`,
    { screen: "parents", parentId }
  );
  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie l'admin d'un message dans les groupes de communication.
 */
export function notifyAdminCommGroupMessage(data, groupId, groupName, senderName, messageText = "") {
  const preview = messageText ? ` : "${messageText.length > 55 ? messageText.slice(0, 55) + '…' : messageText}"` : "";
  const notif = createNotification(
    "admin",
    "message",
    `Message dans ${groupName || "Groupe"}`,
    `${senderName}${preview}`,
    { screen: "commGroups", groupId }
  );
  return [...(data.userNotifications || []), notif];
}

/**
 * Notifie un élève d'un nouveau message privé de l'admin.
 */
export function notifyStudentPrivateMessage(data, studentId) {
  const notif = createNotification(studentId, "info", "Nouveau message", "L'administration vous a envoyé un message privé.", { screen: "chat", tab: "private" });
  return [...(data.userNotifications || []), notif];
}
