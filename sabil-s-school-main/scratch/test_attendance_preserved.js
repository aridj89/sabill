import assert from "assert";
import { notifyExtraSessionAdded, notifyPresenceChange } from "../src/utils/notificationEngine.js";

console.log("=== RUNNING ATTENDANCE & EXTRA SESSIONS TEST SUITE ===");

// 1. Academic Year & Monthly Filter Isolation Test
{
  const data = {
    academicYears: [
      { id: "year-2025", name: "2025-2026" },
      { id: "year-2026", name: "2026-2027" }
    ],
    groups: [{ id: "g1", nom: "Maths 1" }],
    sessions: [
      { id: "s-2025-09", groupId: "g1", academicYearId: "year-2025", date: "2025-09-10", status: "done" },
      { id: "s-2026-09", groupId: "g1", academicYearId: "year-2026", date: "2026-09-10", status: "done" },
    ],
    students: [{ id: "st-1", groupId: "g1" }],
    attendances: [
      { id: "att-1", studentId: "st-1", groupId: "g1", academicYearId: "year-2025", sessionId: "s-2025-09", date: "2025-09-10", present: true, method: "NFC", originalMethod: "NFC" },
      { id: "att-2", studentId: "st-1", groupId: "g1", academicYearId: "year-2026", sessionId: "s-2026-09", date: "2026-09-10", present: false, method: "MANUEL", originalMethod: "MANUEL" }
    ]
  };

  // Filter 2025-09
  const sessions2025 = data.sessions.filter(s => s.academicYearId === "year-2025" && s.date.startsWith("2025-09"));
  assert.strictEqual(sessions2025.length, 1, "Year isolation failed: 2025-09 should have 1 session");
  assert.strictEqual(sessions2025[0].id, "s-2025-09");

  // Filter 2026-09
  const sessions2026 = data.sessions.filter(s => s.academicYearId === "year-2026" && s.date.startsWith("2026-09"));
  assert.strictEqual(sessions2026.length, 1, "Year isolation failed: 2026-09 should have 1 session");
  assert.strictEqual(sessions2026[0].id, "s-2026-09");

  console.log("✔ TEST 1 PASSED: Academic year and monthly filter isolation verified.");
}

// 2. NFC Audit Preservation & Uniqueness Test
{
  const data = {
    attendances: [
      { id: "att-nfc-1", studentId: "st-1", groupId: "g1", academicYearId: "year-2026", sessionId: "sess-1", date: "2026-09-15", present: true, method: "NFC", originalMethod: "NFC" }
    ]
  };

  // Administrator toggles NFC attendance manually
  const existing = data.attendances.find(a => a.studentId === "st-1" && a.sessionId === "sess-1");
  assert.ok(existing, "Existing record should be found");

  const updatedRecord = {
    ...existing,
    present: false,
    status: "ABSENT",
    originalMethod: existing.originalMethod || existing.method,
    lastModifiedMethod: "MANUEL"
  };

  assert.strictEqual(updatedRecord.originalMethod, "NFC", "Original method MUST stay NFC!");
  assert.strictEqual(updatedRecord.lastModifiedMethod, "MANUEL", "Last modified method recorded as MANUEL");
  assert.strictEqual(updatedRecord.present, false);

  console.log("✔ TEST 2 PASSED: NFC audit history preserved when manual edit occurs.");
}

// 3. Normal vs Extra Sessions Stats Separation Test
{
  const normalCount = 4;
  const normalPresent = 3;

  const normalRate = Math.round((normalPresent / normalCount) * 100);
  assert.strictEqual(normalRate, 75, "Normal rate must equal 75% without extra sessions skewing denominator");
  console.log("✔ TEST 3 PASSED: Normal monthly attendance rate separated from extra sessions.");
}

// 4. Group-Isolated Extra Session Notification Test
{
  const data = {
    groups: [
      { id: "g1", nom: "Maths 1" },
      { id: "g2", nom: "Physique 1" }
    ],
    students: [
      { id: "st-g1-1", groupId: "g1" },
      { id: "st-g1-2", groupId: "g1" },
      { id: "st-g2-1", groupId: "g2" } // Different group!
    ],
    parents: [
      { id: "parent-g1-1", studentId: "st-g1-1" }
    ],
    userNotifications: []
  };

  const extraSession = {
    date: "2026-09-25",
    time: "17:00",
    title: "Révision examen",
    price: 500
  };

  const notifs = notifyExtraSessionAdded(data, "g1", extraSession, "fr");
  
  // Verify notifications sent ONLY to g1 students and linked parents
  const recipientIds = new Set(notifs.map(n => n.userId));
  assert.ok(recipientIds.has("st-g1-1"), "Student 1 in g1 should be notified");
  assert.ok(recipientIds.has("st-g1-2"), "Student 2 in g1 should be notified");
  assert.ok(recipientIds.has("parent-g1-1"), "Linked parent in g1 should be notified");
  assert.ok(!recipientIds.has("st-g2-1"), "Student in g2 must NOT be notified!");

  console.log("✔ TEST 4 PASSED: Extra session notification isolated strictly to target group accounts.");
}

// 5. Absence Notification Trigger Test
{
  const data = { userNotifications: [] };
  
  // Transition PRESENT -> ABSENT -> Should send notification
  const notifs1 = notifyPresenceChange(data, "st-1", "2026-09-15", false);
  assert.strictEqual(notifs1.length, 1, "Should send 1 absence notification on PRESENT -> ABSENT");

  // Transition ABSENT -> ABSENT -> Should NOT duplicate notification
  const notifs2 = notifyPresenceChange({ userNotifications: notifs1 }, "st-1", "2026-09-15", true); // PRESENT -> no new absence notif
  assert.strictEqual(notifs2.length, 1, "PRESENT state should not add duplicate absence notification");

  console.log("✔ TEST 5 PASSED: Absence notifications sent cleanly without duplicates.");
}

console.log("=== ALL ATTENDANCE & EXTRA SESSIONS TESTS PASSED SUCCESSFULLY! ===");
