import dotenv from "dotenv";
import HID from "node-hid";

dotenv.config();

const NFC_BACKEND_URL = (process.env.NFC_BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");
const SCAN_ENDPOINT = `${NFC_BACKEND_URL}/api/nfc/scan`;
const DEBOUNCE_MS = parseInt(process.env.SCAN_DEBOUNCE_MS || "3000", 10);

const VENDOR_ID = 0x0483;
const PRODUCT_ID = 0x4343;

console.log("=================================================");
console.log("           NFC Agent started");
console.log(` Target Railway URL : ${NFC_BACKEND_URL}`);
console.log("=================================================\n");

// ── Helpers & Protocol ──
function normalizeCardUid(rawUid) {
  if (!rawUid || typeof rawUid !== "string") return "";
  return rawUid.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

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

// ── State ──
let lastCardUid = null;
let lastScanTime = 0;
let device = null;
let pollTimer = null;
let isConnected = false;
let rxBuf = Buffer.alloc(0);

// Read query frame (strictly non-destructive command 0x0083)
const queryPayload = Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
const queryFrame = makeFrame(0x0083, queryPayload);

async function onRealCardDetected(rawUid) {
  const uid = normalizeCardUid(rawUid);
  const now = Date.now();

  // Local anti-duplicate protection
  if (uid === lastCardUid && (now - lastScanTime) < DEBOUNCE_MS) {
    return;
  }
  lastCardUid = uid;
  lastScanTime = now;

  console.log(`Card detected: ${uid}`);
  console.log("Sending UID to Railway...");

  try {
    const response = await fetch(SCAN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, cardUid: uid }),
    });

    if (!response.ok) {
      console.warn(`Railway server returned status ${response.status}`);
      return;
    }

    const data = await response.json();

    if (data.success && data.student) {
      const studentName = data.student.name || `${data.student.prenom || ""} ${data.student.nom || ""}`.trim();
      console.log(`Student found: ${studentName}`);
      console.log("Attendance marked successfully\n");
    } else if (data.isDuplicate) {
      console.log(`Duplicate scan ignored (already recorded, cooldown: ${data.remainingSeconds || 10}s)\n`);
    } else if (data.reason === "CARD_NOT_REGISTERED" || data.reason === "unregistered_card" || !data.success) {
      console.log(`Card not registered: ${uid}`);
      console.log("(Assign this card to a student in the admin panel)\n");
    } else {
      console.log("Response from server:", data);
    }
  } catch (err) {
    console.error("Railway backend unavailable");
    console.error(`(${err.message})\n`);
  }
}

function findReaderDevice() {
  try {
    const allDevices = HID.devices();
    const matches = allDevices.filter(d => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID);
    if (matches.length === 0) return null;
    return matches.find(d => d.interface === 1) || matches[0];
  } catch (err) {
    return null;
  }
}

function connectReader() {
  if (isConnected && device) return;

  const devInfo = findReaderDevice();
  if (!devInfo) {
    if (isConnected) {
      isConnected = false;
      console.log("NFC Reader disconnected");
    }
    return;
  }

  try {
    device = new HID.HID(devInfo.path);
    isConnected = true;
    rxBuf = Buffer.alloc(0);

    console.log("NFC Reader connected");
    console.log("Waiting for card...\n");

    device.on("data", (data) => {
      rxBuf = Buffer.concat([rxBuf, data]);
      const { frames, rest } = parseFrames(rxBuf);
      rxBuf = rest;

      for (const f of frames) {
        if (f.cmd === 0x0083 && f.payload.length >= 4) {
          const status = f.payload.readUInt32LE(0);
          if (status === 4 && f.payload.length >= 48) {
            // Locate 7-byte UID starting with 0x04
            let uidStart = 41;
            if (f.payload[41] !== 0x04 && f.payload[42] === 0x04) uidStart = 42;
            else if (f.payload[40] === 0x04) uidStart = 40;

            const rawUid = f.payload.subarray(uidStart, uidStart + 7);
            const uidHex = rawUid.toString("hex").toUpperCase();
            onRealCardDetected(uidHex);
          } else {
            // Card removed from field
            if (lastCardUid !== null && (Date.now() - lastScanTime) > 1000) {
              lastCardUid = null;
            }
          }
        }
      }
    });

    device.on("error", (err) => {
      disconnectReader();
    });

    pollTimer = setInterval(() => {
      if (!device) return;
      try {
        sendOutputReport(device, queryFrame);
      } catch {
        disconnectReader();
      }
    }, 300);

  } catch (err) {
    disconnectReader();
  }
}

function disconnectReader() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (device) {
    try { device.close(); } catch (_) {}
    device = null;
  }
  if (isConnected) {
    isConnected = false;
    console.log("NFC Reader disconnected");
  }
}

// Initial start
console.log("Searching for NFC reader...");
connectReader();

// Continuous watchdog: auto-connect when reader is plugged in
setInterval(() => {
  if (!isConnected) {
    connectReader();
  }
}, 2500);

process.on("SIGINT", () => {
  console.log("\nStopping NFC Agent...");
  disconnectReader();
  process.exit(0);
});
