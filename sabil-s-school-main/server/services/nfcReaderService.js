import { EventEmitter } from "events";
import { processCardScan, normalizeCardUid } from "./attendanceService.js";

/**
 * Cloud-safe NFC Service.
 *
 * Runs completely decoupled from native hardware (no node-hid / libusb).
 * Hardware access occurs on the client PC (via browser keyboard hook or local agent bridge).
 * The server receives card scans via POST /api/nfc/scan, executes the attendance
 * lookup in SQLite, and emits events in real-time to SSE clients.
 */
class NfcReaderService extends EventEmitter {
  constructor() {
    super();
    this.connected = true;
    this.currentCardUid = null;
    this.lastScanResult = null;
    this.deviceInfo = {
      product: "Client-Side NFC Bridge / Web Reader",
      manufacturer: "Sabil School Architecture",
      mode: "cloud_api",
    };
  }

  /**
   * Safe lifecycle start.
   */
  start() {
    console.log("✔ [NFC Service] Service NFC Cloud actif — Prêt à recevoir les scans (Web / Agent local)");
    this.emit("status", { connected: true, device: this.deviceInfo });
  }

  /**
   * Safe lifecycle stop.
   */
  stop() {
    console.log("✔ [NFC Service] Service NFC arrêté.");
    this.emit("status", { connected: false, message: "Service arrêté." });
  }

  /**
   * Handle an incoming card scan from the client/bridge.
   * Looks up the card in the database, updates attendance, and broadcasts via SSE.
   *
   * @param {string} rawCardUid
   * @returns {object} Attendance scan result
   */
  handleCardScan(rawCardUid) {
    const cardUid = normalizeCardUid(rawCardUid);
    this.currentCardUid = cardUid;

    const result = processCardScan(cardUid);
    this.lastScanResult = result;

    // Broadcast to SSE clients (attendance screen, modals)
    this.emit("card_scanned", result);

    if (result.success) {
      console.log(`✔ [NFC Scan] Présence validée : ${result.student?.prenom} ${result.student?.nom} (UID: ${cardUid})`);
    } else if (result.isDuplicate) {
      console.log(`ℹ [NFC Scan] Double scan ignoré pour UID: ${cardUid}`);
    } else {
      console.log(`⚠ [NFC Scan] Carte non reconnue : ${cardUid}`);
    }

    return result;
  }

  /**
   * Report reader service status for /api/nfc/status
   */
  getStatus() {
    return {
      connected: this.connected,
      isPolling: false,
      mode: "client_bridge",
      device: this.deviceInfo,
      currentCardUid: this.currentCardUid,
      lastScanResult: this.lastScanResult,
    };
  }
}

// Export singleton instance
export const nfcReaderService = new NfcReaderService();
