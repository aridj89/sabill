import dotenv from "dotenv";
import HID from "node-hid";

dotenv.config();

const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const SCAN_ENDPOINT = `${API_BASE_URL}/api/nfc/scan`;
const COOLDOWN_MS = parseInt(process.env.SCAN_COOLDOWN_MS || "1500", 10);

console.log("==================================================================");
console.log("      🚀 SABIL SCHOOL — LOCAL NFC USB BRIDGE AGENT");
console.log("==================================================================");
console.log(`🌐 Target Cloud API : ${SCAN_ENDPOINT}`);
console.log(`⏱  Scan Cooldown   : ${COOLDOWN_MS}ms`);
console.log("==================================================================\n");

// ── State ──
let lastCardUid = null;
let lastScanTime = 0;

// ── Post Card to Cloud API ──
async function postCardToCloud(cardUid) {
  const now = Date.now();
  if (cardUid === lastCardUid && (now - lastScanTime) < COOLDOWN_MS) {
    return;
  }
  lastCardUid = cardUid;
  lastScanTime = now;

  console.log(`📡 [NFC READ] UID: ${cardUid} -> Sending to ${SCAN_ENDPOINT}...`);

  try {
    const response = await fetch(SCAN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardUid }),
    });

    if (!response.ok) {
      console.warn(`⚠ Server responded with status ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    if (data.success && data.student) {
      console.log(`✅ [ATTENDANCE VALIDATED] Élève: ${data.student.prenom} ${data.student.nom} (${data.student.phone || "No phone"})`);
    } else if (data.isDuplicate) {
      console.log(`ℹ [DUPLICATE SCAN] ${data.message || "Déjà pointé récemment"}`);
    } else if (data.reason === "unregistered_card" || !data.success) {
      console.log(`⚠ [CARD NOT ASSIGNED] ${data.message || "Carte non attribuée à un élève"}`);
    } else {
      console.log(`ℹ [RESPONSE]`, data);
    }
  } catch (err) {
    console.error(`❌ Network error while posting to cloud API: ${err.message}`);
    console.error(`   Make sure your server is reachable at: ${API_BASE_URL}`);
  }
}

// ────────────────────────────────────────────────────────────────
// 1. 5YOA USB HID DRIVER (VID 0x0483, PID 0x4343)
// ────────────────────────────────────────────────────────────────
const VENDOR_ID_5YOA = 0x0483;
const PRODUCT_ID_5YOA = 0x4343;

function xorChecksum(payload, checksumLen) {
  let x = 0;
  if (checksumLen === undefined) checksumLen = payload.length;
  for (let i = 0; i < checksumLen; i++) x ^= payload[i];
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
    if (buf[i] !== 0x55) { i++; continue; }
    if (i + 7 > buf.length) break;
    const cmd = (buf[i + 1] << 8) | buf[i + 2];
    const length = (buf[i + 3] << 8) | buf[i + 4];
    const end = i + 5 + length + 2;
    if (end > buf.length) break;
    const payload = buf.subarray(i + 5, i + 5 + length);
    const checksum = buf.subarray(i + 5 + length, end);
    const expectedChk = xorChecksum(payload, length & 0xff);
    frames.push({ cmd, payload, ok: checksum.equals(expectedChk) });
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
    } catch {
      device.write(padded);
    }
  }
}

function start5YoaReader() {
  let device = null;
  let pollTimer = null;
  let rxBuf = Buffer.alloc(0);
  let currentCardUid = null;

  const queryPayload = Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
  const queryFrame = makeFrame(0x0083, queryPayload);

  function tryConnect() {
    try {
      const devices = HID.devices();
      const matches = devices.filter(d => d.vendorId === VENDOR_ID_5YOA && d.productId === PRODUCT_ID_5YOA);
      if (matches.length === 0) return false;

      const devInfo = matches.find(d => d.interface === 1) || matches[0];
      device = new HID.HID(devInfo.path);
      rxBuf = Buffer.alloc(0);

      console.log(`✔ [5YOA HID] Connected: ${devInfo.product || "5YOA NFC Reader"} (Path: ${devInfo.path})`);

      device.on("data", (data) => {
        rxBuf = Buffer.concat([rxBuf, data]);
        const { frames, rest } = parseFrames(rxBuf);
        rxBuf = rest;

        for (const f of frames) {
          if (f.cmd === 0x0083 && f.payload.length >= 4) {
            const status = f.payload.readUInt32LE(0);
            if (status === 4 && f.payload.length >= 48) {
              let uidStart = 41;
              if (f.payload[41] !== 0x04 && f.payload[42] === 0x04) uidStart = 42;
              else if (f.payload[40] === 0x04) uidStart = 40;

              const rawUid = f.payload.subarray(uidStart, uidStart + 7);
              const uidHex = rawUid.toString("hex").toUpperCase();

              if (currentCardUid !== uidHex) {
                currentCardUid = uidHex;
                postCardToCloud(uidHex);
              }
            } else {
              currentCardUid = null;
            }
          }
        }
      });

      device.on("error", (err) => {
        console.warn("⚠ [5YOA HID] Device error:", err.message);
        cleanupDevice();
      });

      pollTimer = setInterval(() => {
        if (!device) return;
        try {
          sendOutputReport(device, queryFrame);
        } catch {
          cleanupDevice();
        }
      }, 300);

      return true;
    } catch (err) {
      return false;
    }
  }

  function cleanupDevice() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (device) {
      try { device.close(); } catch (_) {}
      device = null;
    }
  }

  // Initial connect attempt
  const found = tryConnect();
  if (!found) {
    console.log("ℹ 5YOA HID Reader not detected yet. Watching for USB connection...");
  }

  // Continuous auto-reconnect watchdog
  setInterval(() => {
    if (!device) {
      tryConnect();
    }
  }, 3000);
}

// ────────────────────────────────────────────────────────────────
// 2. PC/SC DRIVER (ACR122U, ACR1252, etc.)
// ────────────────────────────────────────────────────────────────
async function tryStartPcscReader() {
  try {
    const pcscliteModule = await import("@pokusew/pcsclite").catch(() => null);
    if (!pcscliteModule) return;

    const pcsclite = pcscliteModule.default || pcscliteModule;
    const pcsc = pcsclite();

    pcsc.on("reader", (reader) => {
      console.log(`✔ [PC/SC] Reader detected: ${reader.name}`);

      reader.on("status", (status) => {
        const changes = reader.state ^ status.state;
        if (changes) {
          if ((status.state & reader.SCARD_STATE_PRESENT) && !(reader.state & reader.SCARD_STATE_PRESENT)) {
            // Card connected: transmit APDU to read UID (FF CA 00 00 00)
            reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err, protocol) => {
              if (err) return;
              const apduGetUid = Buffer.from([0xFF, 0xCA, 0x00, 0x00, 0x00]);
              reader.transmit(apduGetUid, 40, protocol, (err, data) => {
                if (!err && data && data.length >= 2) {
                  // Last 2 bytes are SW1, SW2 (0x90 0x00 for success)
                  const sw1 = data[data.length - 2];
                  const sw2 = data[data.length - 1];
                  if (sw1 === 0x90 && sw2 === 0x00) {
                    const uidHex = data.subarray(0, data.length - 2).toString("hex").toUpperCase();
                    postCardToCloud(uidHex);
                  }
                }
              });
            });
          }
        }
      });

      reader.on("end", () => {
        console.log(`⚠ [PC/SC] Reader disconnected: ${reader.name}`);
      });
    });

    pcsc.on("error", (err) => {
      console.warn("⚠ [PC/SC] Daemon error:", err.message);
    });
  } catch (_) {
    // PC/SC not installed or unavailable
  }
}

// Start listeners
start5YoaReader();
tryStartPcscReader();

console.log("Ready! Tap a card on your USB NFC reader anytime.");
console.log("Press Ctrl+C to stop.\n");
