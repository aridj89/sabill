import { loadDatabase, saveDatabase } from "../utils/db.js";

// In-memory debounce / cooldown tracking: cardUid -> timestamp (ms)
const scanHistoryMap = new Map();
let debouncePeriodMs = 10000; // Default 10 seconds

/**
 * Normalize raw card UID to uppercase hex string without delimiters.
 */
export function normalizeCardUid(rawUid) {
  if (!rawUid || typeof rawUid !== "string") return "";
  return rawUid.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

/**
 * Configure anti-duplicate cooldown period in seconds.
 */
export function setDebounceSeconds(seconds) {
  const s = parseInt(seconds, 10);
  if (!isNaN(s) && s >= 1 && s <= 300) {
    debouncePeriodMs = s * 1000;
  }
  return debouncePeriodMs / 1000;
}

export function getDebounceSeconds() {
  return debouncePeriodMs / 1000;
}

/**
 * Clear debounce cooldown for testing or manual reset.
 */
export function clearDebounceHistory() {
  scanHistoryMap.clear();
}

/**
 * Assign an NFC card UID to a student.
 */
export function assignCardToStudent(studentId, rawUid) {
  const cardUid = normalizeCardUid(rawUid);
  if (!cardUid) {
    return { success: false, message: "UID de carte invalide." };
  }
  if (!studentId) {
    return { success: false, message: "ID de l'élève requis." };
  }

  const db = loadDatabase();
  const students = db.students || [];
  const targetStudent = students.find(s => s.id === studentId);

  if (!targetStudent) {
    return { success: false, message: `Élève avec ID "${studentId}" introuvable.` };
  }

  // Check if card is already assigned to another student
  const existingAssignee = students.find(s => s.id !== studentId && normalizeCardUid(s.nfcCardId) === cardUid);
  if (existingAssignee) {
    return {
      success: false,
      message: `Cette carte (${cardUid}) est déjà attribuée à l'élève ${existingAssignee.prenom} ${existingAssignee.nom}.`,
      assignedTo: { id: existingAssignee.id, nom: existingAssignee.nom, prenom: existingAssignee.prenom },
    };
  }

  // Assign card
  targetStudent.nfcCardId = cardUid;
  saveDatabase(db);

  return {
    success: true,
    message: `Carte NFC ${cardUid} attribuée avec succès à ${targetStudent.prenom} ${targetStudent.nom}.`,
    student: {
      id: targetStudent.id,
      nom: targetStudent.nom,
      prenom: targetStudent.prenom,
      phone: targetStudent.phone,
      subgroupId: targetStudent.subgroupId,
      nfcCardId: targetStudent.nfcCardId,
    },
  };
}

/**
 * Process a card scan: finds student, checks debounce, records attendance, creates notification.
 */
export function processCardScan(rawUid) {
  const cardUid = normalizeCardUid(rawUid);
  if (!cardUid) {
    return { success: false, isDuplicate: false, reason: "invalid_uid", message: "UID de carte invalide." };
  }

  const now = Date.now();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const timeStr = today.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const timeShort = timeStr.slice(0, 5);

  const db = loadDatabase();
  const students = db.students || [];

  // 1. Find matching student
  const student = students.find(s => normalizeCardUid(s.nfcCardId) === cardUid);

  if (!student) {
    return {
      success: false,
      isDuplicate: false,
      reason: "unregistered_card",
      cardUid,
      timestamp: timeStr,
      message: `Carte NFC inconnue (${cardUid}). Veuillez l'attribuer à un élève.`,
    };
  }

  // 2. Check Anti-duplicate Debounce
  const lastScanTime = scanHistoryMap.get(cardUid);
  if (lastScanTime && (now - lastScanTime) < debouncePeriodMs) {
    const elapsed = now - lastScanTime;
    const remainingSeconds = Math.ceil((debouncePeriodMs - elapsed) / 1000);
    return {
      success: false,
      isDuplicate: true,
      cardUid,
      remainingSeconds,
      timestamp: timeStr,
      student: {
        id: student.id,
        nom: student.nom,
        prenom: student.prenom,
        phone: student.phone,
        subgroupId: student.subgroupId,
        nfcCardId: student.nfcCardId,
      },
      message: `Double scan ignoré pour ${student.prenom} ${student.nom}. Patientez ${remainingSeconds}s.`,
    };
  }

  // Update scan history timestamp
  scanHistoryMap.set(cardUid, now);

  // 3. Find or define Target Session
  const subgroupId = student.subgroupId || "default_group";
  const subgroups = db.subgroups || [];
  const subgroup = subgroups.find(sg => sg.id === subgroupId);
  const subgroupName = subgroup ? subgroup.nom : "";

  // Check existing session for subgroup today
  const existingSession = (db.sessions || []).find(s => s.subgroupId === subgroupId && s.date === todayStr);
  const targetSessionId = existingSession ? existingSession.id : `sess_nfc_${todayStr}_${subgroupId}`;

  // 4. Record Attendance
  const attendances = db.attendances || [];
  const existingAttIndex = attendances.findIndex(
    a => a.studentId === student.id && (a.sessionId === targetSessionId || a.date === todayStr)
  );

  const attendanceRecord = {
    id: existingAttIndex >= 0 ? attendances[existingAttIndex].id : `att_${now}_${Math.random().toString(36).substring(2, 7)}`,
    sessionId: targetSessionId,
    studentId: student.id,
    date: todayStr,
    time: timeShort,
    present: true,
    nfcVerified: true,
    cardUid,
    createdAt: new Date().toISOString(),
  };

  if (existingAttIndex >= 0) {
    attendances[existingAttIndex] = attendanceRecord;
  } else {
    attendances.push(attendanceRecord);
  }
  db.attendances = attendances;

  // 5. Create In-App Notification for Student
  const notif = {
    id: `notif_${now}_${Math.random().toString(36).substring(2, 7)}`,
    userId: student.id,
    type: "presence",
    title: "Pointage NFC validé ⏱️",
    message: `Votre présence${subgroupName ? ` (${subgroupName})` : ""} a été validée par NFC le ${todayStr} à ${timeShort}.`,
    date: todayStr,
    time: timeShort,
    read: false,
    cardUid,
  };

  db.userNotifications = [...(db.userNotifications || []), notif];

  // 6. Save database atomically
  saveDatabase(db);

  return {
    success: true,
    isDuplicate: false,
    cardUid,
    timestamp: timeStr,
    student: {
      id: student.id,
      nom: student.nom,
      prenom: student.prenom,
      phone: student.phone,
      subgroupId: student.subgroupId,
      subgroupName,
      nfcCardId: student.nfcCardId,
    },
    attendance: attendanceRecord,
    notification: notif,
    message: `Présence validée avec succès pour ${student.prenom} ${student.nom}.`,
  };
}
