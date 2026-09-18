import HID from "node-hid";
import { EventEmitter } from "events";
import { processCardScan, normalizeCardUid } from "./attendanceService.js";

const VENDOR_ID = 0x0483;
const PRODUCT_ID = 0x4343;
const POLL_INTERVAL_MS = 300;

function xorChecksum(payload, checksumLen) {
  let x = 0;
  if (checksumLen === undefined) checksumLen = payload.length;
  for (let i = 0; i < checksumLen; i++) {
    x ^= payload[i];
  }
  return Buffer.from([x ^ 0xff, x]);
}

function makeFrame(cmd, payload = Buffer.alloc(0)) {
  const len = payload.length;
  const header = Buffer.from([
    0x55,
    (cmd >> 8) & 0xff,
    cmd & 0xff,
    (len >> 8) & 0xff,
    len & 0xff,
  ]);
  const chk = xorChecksum(payload, len & 0xff);
  return Buffer.concat([header, payload, chk]);
}

function parseFrames(buf) {
  const frames = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] !== 0x55) {
      i++;
      continue;
    }
    if (i + 7 > buf.length) break;
    const cmd = (buf[i + 1] << 8) | buf[i + 2];
    const length = (buf[i + 3] << 8) | buf[i + 4];
    const end = i + 5 + length + 2;
    if (end > buf.length) break;
    const payload = buf.subarray(i + 5, i + 5 + length);
    const checksum = buf.subarray(i + 5 + length, end);
    const expectedChk = xorChecksum(payload, length & 0xff);
    const ok = checksum.equals(expectedChk);
    frames.push({ cmd, payload, ok });
    i = end;
  }
  return { frames, rest: buf.subarray(i) };
}

function sendOutputReport(device, frame) {
  const REPORT_SIZE = 64;
  for (let offset = 0; offset < frame.length; offset += REPORT_SIZE) {
    const chunk = frame.subarray(offset, offset + REPORT_SIZE);
    const padded = Buffer.alloc(REPORT_SIZE, 0);
    chunk.copy(padded);
    try {
      device.write(Buffer.concat([Buffer.from([0x00]), padded]));
    } catch (e) {
      device.write(padded);
    }
  }
}

class NfcReaderService extends EventEmitter {
  constructor() {
    super();
    this.device = null;
    this.deviceInfo = null;
    this.connected = false;
    this.isPolling = false;
    this.pollTimer = null;
    this.reconnectTimer = null;
    this.currentCardUid = null;
    this.lastScanResult = null;
    this.rxBuf = Buffer.alloc(0);

    // Read-only presence query frame (0x0083)
    const queryPayload = Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
    this.queryFrame = makeFrame(0x0083, queryPayload);
  }

  /**
   * Find matching 5YOA HID device (VID 0x0483, PID 0x4343, Interface 1).
   */
  findDevice() {
    try {
      const devices = HID.devices();
      const matches = devices.filter(d => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID);
      if (matches.length === 0) return null;
      return matches.find(d => d.interface === 1) || matches[0];
    } catch (err) {
      if (!this._hasWarnedHid) {
        console.log("ℹ [NFC Service] Lecteur USB non disponible sur ce serveur (Mode Cloud / Pas de matériel USB) :", err.message);
        this._hasWarnedHid = true;
      }
      if (err.message && (err.message.includes("libusb") || err.message.includes("cannot open shared object file"))) {
        this.disabled = true;
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      }
      return null;
    }
  }

  /**
   * Start the reader service and connect to USB device.
   */
  start() {
    if (this.disabled) return;
    this.connect();
    // Watchdog for auto-reconnect if disconnected
    if (!this.reconnectTimer) {
      this.reconnectTimer = setInterval(() => {
        if (!this.connected) {
          this.connect();
        }
      }, 3000);
    }
  }

  /**
   * Connect to the 5YOA HID device.
   */
  connect() {
    if (this.connected && this.device) return;

    const devInfo = this.findDevice();
    if (!devInfo) {
      if (this.connected) {
        this.connected = false;
        this.emit("status", { connected: false, message: "Lecteur NFC déconnecté." });
      }
      return;
    }

    try {
      this.device = new HID.HID(devInfo.path);
      this.deviceInfo = {
        manufacturer: devInfo.manufacturer || "CYBDZKJ-BSJ",
        product: devInfo.product || "TCC-TSY-TBY",
        serialNumber: devInfo.serialNumber || "BEGIN-2025",
        interface: devInfo.interface,
        vendorId: devInfo.vendorId,
        productId: devInfo.productId,
      };
      this.connected = true;
      this.rxBuf = Buffer.alloc(0);

      console.log(`✔ [NFC Service] Lecteur 5YOA connecté : ${this.deviceInfo.product} (VID 0x${VENDOR_ID.toString(16)}:PID 0x${PRODUCT_ID.toString(16)})`);
      this.emit("status", { connected: true, device: this.deviceInfo });

      // Handle incoming HID input reports
      this.device.on("data", (data) => this.handleData(data));
      this.device.on("error", (err) => this.handleError(err));

      // Start periodic presence polling (read-only query 0x0083)
      this.startPolling();
    } catch (err) {
      console.warn("Impossible d'ouvrir le lecteur NFC:", err.message);
      this.connected = false;
      this.device = null;
    }
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.isPolling = true;

    this.pollTimer = setInterval(() => {
      if (!this.connected || !this.device) return;
      try {
        sendOutputReport(this.device, this.queryFrame);
      } catch (err) {
        this.handleError(err);
      }
    }, POLL_INTERVAL_MS);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isPolling = false;
  }

  handleData(data) {
    this.rxBuf = Buffer.concat([this.rxBuf, data]);
    const { frames, rest } = parseFrames(this.rxBuf);
    this.rxBuf = rest;

    for (const f of frames) {
      if (f.cmd === 0x0083 && f.payload.length >= 4) {
        const status = f.payload.readUInt32LE(0);

        if (status === 4 && f.payload.length >= 48) {
          // NTAG card detected
          let uidStart = 41;
          if (f.payload[41] !== 0x04 && f.payload[42] === 0x04) {
            uidStart = 42;
          } else if (f.payload[40] === 0x04) {
            uidStart = 40;
          }

          const rawUid = f.payload.subarray(uidStart, uidStart + 7);
          const uidHex = normalizeCardUid(rawUid.toString("hex"));

          if (this.currentCardUid !== uidHex) {
            this.currentCardUid = uidHex;
            this.onCardDetected(uidHex);
          }
        } else {
          // No card present
          if (this.currentCardUid !== null) {
            const removedUid = this.currentCardUid;
            this.currentCardUid = null;
            this.emit("card_removed", { cardUid: removedUid });
          }
        }
      }
    }
  }

  onCardDetected(cardUid) {
    console.log(`📡 [NFC Service] Carte détectée : ${cardUid}`);

    // Process attendance through attendanceService
    const result = processCardScan(cardUid);
    this.lastScanResult = result;

    this.emit("card_scanned", result);

    if (result.success) {
      console.log(`✔ [NFC Service] Présence enregistrée pour : ${result.student.prenom} ${result.student.nom}`);
    } else if (result.isDuplicate) {
      console.log(`ℹ [NFC Service] Double scan ignoré : ${result.message}`);
    } else {
      console.log(`⚠ [NFC Service] Carte non attribuée : ${cardUid}`);
    }
  }

  handleError(err) {
    console.warn("Erreur périphérique NFC HID:", err.message);
    this.connected = false;
    this.stopPolling();
    try {
      if (this.device) this.device.close();
    } catch (_) {}
    this.device = null;
    this.emit("status", { connected: false, message: err.message });
  }

  stop() {
    this.stopPolling();
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.device) {
      try { this.device.close(); } catch (_) {}
      this.device = null;
    }
    this.connected = false;
  }

  getStatus() {
    return {
      connected: this.connected,
      isPolling: this.isPolling,
      device: this.deviceInfo,
      currentCardUid: this.currentCardUid,
      lastScanResult: this.lastScanResult,
    };
  }
}

// Export singleton instance
export const nfcReaderService = new NfcReaderService();
