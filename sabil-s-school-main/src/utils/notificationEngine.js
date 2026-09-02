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
 * Notifie tous les élèves d'un sous-groupe qu'une séance a été ajoutée/modifiée/annulée.
 */
export function notifySessionChange(data, subgroupId, actionType, sessionDetails) {
  const students = data.students.filter(s => s.subgroupId === subgroupId);
  if (students.length === 0) return data.userNotifications;

  let title = "";
  let message = "";

  if (actionType === "added") {
    title = "Nouvelle séance";
    message = `Une séance supplémentaire a été ajoutée le ${sessionDetails.date} à ${sessionDetails.time}.`;
  } else if (actionType === "modified") {
    title = "Séance modifiée";
    message = `La séance du ${sessionDetails.date} à ${sessionDetails.time} a été modifiée.`;
  } else if (actionType === "cancelled") {
    title = "Séance annulée";
    message = `La séance prévue le ${sessionDetails.date} à ${sessionDetails.time} a été annulée.`;
  } else {
    return data.userNotifications;
  }

  const newNotifs = students.map(st => createNotification(st.id, "session", title, message));
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
 * Notifie un élève d'un paiement en attente.
 */
export function notifyPaymentRequired(data, studentId, amount, reason) {
  const title = "Paiement en attente";
  let message = "";
  
  if (reason === "enrollment") {
    message = `Vos frais d'inscription (${amount} DA) sont en attente de paiement.`;
  } else {
    message = `Votre paiement pour le cycle ${reason} (${amount} DA) est en attente.`;
  }

  const notif = createNotification(studentId, "payment", title, message);
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
