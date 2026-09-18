import express from "express";
import { nfcReaderService } from "../services/nfcReaderService.js";
import {
  processCardScan,
  assignCardToStudent,
  setDebounceSeconds,
  getDebounceSeconds,
  clearDebounceHistory,
} from "../services/attendanceService.js";

const router = express.Router();

/**
 * GET /api/nfc/status — Get hardware reader connection status and recent scan
 */
router.get("/status", (req, res) => {
  const status = nfcReaderService.getStatus();
  res.json({
    success: true,
    reader: status,
    config: {
      debounceSeconds: getDebounceSeconds(),
    },
  });
});

/**
 * POST /api/nfc/assign — Assign a card UID to a student
 * Body: { studentId: string, cardUid: string }
 */
router.post("/assign", (req, res) => {
  const { studentId, cardUid } = req.body;
  if (!studentId || !cardUid) {
    return res.status(400).json({
      success: false,
      message: "studentId et cardUid sont requis.",
    });
  }

  const result = assignCardToStudent(studentId, cardUid);
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

/**
 * POST /api/nfc/scan — Manually process a card UID (useful for testing or software wedge)
 * Body: { cardUid: string }
 */
router.post("/scan", (req, res) => {
  const { cardUid } = req.body;
  if (!cardUid) {
    return res.status(400).json({
      success: false,
      message: "cardUid est requis.",
    });
  }

  const result = nfcReaderService.handleCardScan(cardUid);
  res.json(result);
});

/**
 * POST /api/nfc/config — Update debounce / anti-duplicate period
 * Body: { debounceSeconds: number }
 */
router.post("/config", (req, res) => {
  const { debounceSeconds } = req.body;
  if (debounceSeconds !== undefined) {
    const updated = setDebounceSeconds(debounceSeconds);
    return res.json({ success: true, debounceSeconds: updated });
  }
  res.json({ success: true, debounceSeconds: getDebounceSeconds() });
});

/**
 * POST /api/nfc/clear-history — Reset debounce cooldown (useful for testing)
 */
router.post("/clear-history", (req, res) => {
  clearDebounceHistory();
  res.json({ success: true, message: "Historique de debounce réinitialisé." });
});

/**
 * GET /api/nfc/stream — Server-Sent Events (SSE) for real-time card tap events
 */
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial connection and status
  sendEvent("connected", {
    time: new Date().toISOString(),
    readerStatus: nfcReaderService.getStatus(),
  });

  // Listen to hardware reader events
  const onCardScanned = (data) => sendEvent("card_scanned", data);
  const onCardRemoved = (data) => sendEvent("card_removed", data);
  const onStatusChange = (data) => sendEvent("status_change", data);

  nfcReaderService.on("card_scanned", onCardScanned);
  nfcReaderService.on("card_removed", onCardRemoved);
  nfcReaderService.on("status", onStatusChange);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 20000);

  // Clean up listeners when client disconnects
  req.on("close", () => {
    clearInterval(heartbeat);
    nfcReaderService.off("card_scanned", onCardScanned);
    nfcReaderService.off("card_removed", onCardRemoved);
    nfcReaderService.off("status", onStatusChange);
  });
});

export default router;
