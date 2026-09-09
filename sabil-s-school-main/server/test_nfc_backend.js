import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "database.json");

const BASE_URL = "http://localhost:5000/api/nfc";

async function runTests() {
  console.log("==========================================================");
  console.log("       EXPRESS NFC ATTENDANCE BACKEND TEST SUITE          ");
  console.log("==========================================================\n");

  let passedCount = 0;
  let totalCount = 7;

  // TEST 1: NFC Reader Detection
  console.log("▶ TEST 1: NFC Reader Hardware Detection");
  try {
    const res = await fetch(`${BASE_URL}/status`);
    const data = await res.json();
    console.log("   HTTP Status :", res.status);
    console.log("   Connected   :", data.reader?.connected);
    console.log("   Device      :", data.reader?.device?.product, `(VID: 0x${data.reader?.device?.vendorId?.toString(16)})`);
    console.log("   Polling     :", data.reader?.isPolling);
    console.log("   Debounce    :", data.config?.debounceSeconds, "seconds");

    if (data.success && data.reader?.connected) {
      console.log("   ✔ PASSED: 5YOA NFC Reader connected and polling.\n");
      passedCount++;
    } else {
      console.log("   ✖ FAILED: Reader not connected.\n");
    }
  } catch (err) {
    console.error("   ✖ ERROR:", err.message, "\n");
  }

  // Clear debounce history before scan tests to ensure clean state
  await fetch(`${BASE_URL}/clear-history`, { method: "POST" });

  // TEST 2: Student / Card Assignment
  console.log("▶ TEST 2: Student / Card Assignment");
  const testCardUid = "04F3F0A4400289";
  const testStudentId = "lvnj815w";
  try {
    const res = await fetch(`${BASE_URL}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: testStudentId, cardUid: testCardUid }),
    });
    const data = await res.json();
    console.log("   HTTP Status :", res.status);
    console.log("   Success     :", data.success);
    console.log("   Student     :", `${data.student?.prenom} ${data.student?.nom} (ID: ${data.student?.id})`);
    console.log("   Card UID    :", data.student?.nfcCardId);

    if (data.success && data.student?.nfcCardId === testCardUid) {
      console.log("   ✔ PASSED: Card assigned to student successfully.\n");
      passedCount++;
    } else {
      console.log("   ✖ FAILED:", data.message, "\n");
    }
  } catch (err) {
    console.error("   ✖ ERROR:", err.message, "\n");
  }

  // TEST 3: Successful Attendance Scan
  console.log("▶ TEST 3: Successful Attendance Scan");
  let firstAttendanceId = null;
  try {
    const res = await fetch(`${BASE_URL}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardUid: testCardUid }),
    });
    const data = await res.json();
    console.log("   HTTP Status :", res.status);
    console.log("   Success     :", data.success);
    console.log("   Student     :", `${data.student?.prenom} ${data.student?.nom}`);
    console.log("   Date / Time :", `${data.attendance?.date} at ${data.attendance?.time}`);
    console.log("   Session ID  :", data.attendance?.sessionId);
    console.log("   NFC Verified:", data.attendance?.nfcVerified);

    if (data.success && data.attendance?.nfcVerified && !data.isDuplicate) {
      firstAttendanceId = data.attendance.id;
      console.log("   ✔ PASSED: Attendance recorded successfully.\n");
      passedCount++;
    } else {
      console.log("   ✖ FAILED:", data.message, "\n");
    }
  } catch (err) {
    console.error("   ✖ ERROR:", err.message, "\n");
  }

  // TEST 4: Duplicate Scan Prevention within 10s
  console.log("▶ TEST 4: Duplicate Scan Prevention (within 10s cooldown)");
  try {
    const res = await fetch(`${BASE_URL}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardUid: testCardUid }),
    });
    const data = await res.json();
    console.log("   HTTP Status :", res.status);
    console.log("   Is Duplicate:", data.isDuplicate);
    console.log("   Remaining   :", data.remainingSeconds, "seconds");
    console.log("   Message     :", data.message);

    if (data.isDuplicate === true && data.remainingSeconds > 0) {
      console.log("   ✔ PASSED: Duplicate scan correctly blocked by 10s debounce.\n");
      passedCount++;
    } else {
      console.log("   ✖ FAILED: Did not block duplicate scan.\n");
    }
  } catch (err) {
    console.error("   ✖ ERROR:", err.message, "\n");
  }

  // TEST 5: Unknown / Unregistered Card
  console.log("▶ TEST 5: Unknown / Unregistered Card Handling");
  const unknownCardUid = "04A1B2C3D4E5F6";
  try {
    const res = await fetch(`${BASE_URL}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardUid: unknownCardUid }),
    });
    const data = await res.json();
    console.log("   HTTP Status :", res.status);
    console.log("   Success     :", data.success);
    console.log("   Reason      :", data.reason);
    console.log("   Message     :", data.message);

    if (data.success === false && data.reason === "unregistered_card") {
      console.log("   ✔ PASSED: Unknown card correctly rejected with 'unregistered_card'.\n");
      passedCount++;
    } else {
      console.log("   ✖ FAILED:", data.message, "\n");
    }
  } catch (err) {
    console.error("   ✖ ERROR:", err.message, "\n");
  }

  // TEST 6: Database Persistence Check
  console.log("▶ TEST 6: Database Persistence Verification (database.json on disk)");
  try {
    const rawDb = fs.readFileSync(DB_PATH, "utf-8");
    const db = JSON.parse(rawDb);
    const persistedStudent = (db.students || []).find(s => s.id === testStudentId);
    const persistedAttendance = (db.attendances || []).find(a => a.studentId === testStudentId && a.cardUid === testCardUid);

    console.log("   Student nfcCardId in database.json:", persistedStudent?.nfcCardId);
    console.log("   Found attendance record on disk    :", persistedAttendance ? `ID ${persistedAttendance.id} (${persistedAttendance.date} ${persistedAttendance.time})` : "None");

    if (persistedStudent?.nfcCardId === testCardUid && persistedAttendance) {
      console.log("   ✔ PASSED: Data properly persisted to server/database.json.\n");
      passedCount++;
    } else {
      console.log("   ✖ FAILED: Data not found in database.json.\n");
    }
  } catch (err) {
    console.error("   ✖ ERROR:", err.message, "\n");
  }

  // TEST 7: Student Notification Creation
  console.log("▶ TEST 7: Student Notification Verification");
  try {
    const rawDb = fs.readFileSync(DB_PATH, "utf-8");
    const db = JSON.parse(rawDb);
    const notification = (db.userNotifications || []).find(n => n.userId === testStudentId && n.type === "presence" && n.cardUid === testCardUid);

    console.log("   Notification Title   :", notification?.title);
    console.log("   Notification Message :", notification?.message);
    console.log("   Notification Date/Time:", `${notification?.date} at ${notification?.time}`);

    if (notification && notification.type === "presence") {
      console.log("   ✔ PASSED: In-app student notification created successfully.\n");
      passedCount++;
    } else {
      console.log("   ✖ FAILED: Presence notification not found.\n");
    }
  } catch (err) {
    console.error("   ✖ ERROR:", err.message, "\n");
  }

  console.log("==========================================================");
  console.log(`  SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log("==========================================================");
}

runTests().catch(console.error);
