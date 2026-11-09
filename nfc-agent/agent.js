import dotenv from "dotenv";
import HID from "node-hid";
import https from "https";

dotenv.config();

const NFC_BACKEND_URL = (process.env.NFC_BACKEND_URL || "https://caring-nature-production-c5b4.up.railway.app").replace(/\/+$/, "");
const SCAN_ENDPOINT = `${NFC_BACKEND_URL}/api/nfc/scan`;
const DEBOUNCE_MS = parseInt(process.env.SCAN_DEBOUNCE_MS || "3000", 10);
// 250ms polling allows full ISO14443-A RF anti-collision cycle without jamming
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "250", 10);

const VENDOR_ID = 0x0483;
const PRODUCT_ID = 0x4343;

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  timeout: 5000,
});

console.log("=================================================");
console.log("       ⚡ Sabil School — Instant NFC Agent");
console.log(` Target Railway URL : ${NFC_BACKEND_URL}`);
console.log(` Poll Frequency     : ${POLL_INTERVAL_MS}ms (Calibrated)`);
console.log("=================================================\n");

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
    if (length > 256) { i++; continue; }
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

function extractUidFromPayload(payload) {
  if (!payload || payload.length < 12) return null;

  for (let i = 8; i <= payload.length - 7; i++) {
    if (payload[i] === 0x04) {
      const candidate = payload.subarray(i, i + 7);
      if (!candidate.every(b => b === 0) && !candidate.every(b => b === 0xff)) {
        return candidate.toString("hex").toUpperCase();
      }
    }
  }

  if (payload.length >= 48) {
    let uidStart = 41;
    if (payload[41] !== 0x04 && payload[42] === 0x04) uidStart = 42;
    else if (payload[40] === 0x04) uidStart = 40;
    const raw7 = payload.subarray(uidStart, uidStart + 7);
    if (!raw7.every(b => b === 0)) return raw7.toString("hex").toUpperCase();
  }

  if (payload.length >= 44) {
    const raw4 = payload.subarray(40, 44);
    if (!raw4.every(b => b === 0) && !raw4.every(b => b === 0xff)) {
      return raw4.toString("hex").toUpperCase();
    }
  }

  return null;
}

let lastCardUid = null;
let lastScanTime = 0;
let device = null;
let pollTimer = null;
let isConnected = false;
let rxBuf = Buffer.alloc(0);

const queryPayload = Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
const queryFrame = makeFrame(0x0083, queryPayload);

async function onRealCardDetected(rawUid) {
  const uid = normalizeCardUid(rawUid);
  const now = Date.now();

  if (uid === lastCardUid && (now - lastScanTime) < DEBOUNCE_MS) {
    return;
  }
  lastCardUid = uid;
  lastScanTime = now;

  const t0 = performance.now();
  console.log(`⚡ [DETECTED] Card UID: ${uid}`);

  try {
    const response = await fetch(SCAN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive"
      },
      body: JSON.stringify({ uid, cardUid: uid }),
      agent: httpsAgent,
    });

    const elapsed = Math.round(performance.now() - t0);

    if (!response.ok) {
      console.warn(`Railway server returned status ${response.status} in ${elapsed}ms`);
      return;
    }

    const data = await response.json();

    if (data.success && data.student) {
      const studentName = data.student.name || `${data.student.prenom || ""} ${data.student.nom || ""}`.trim();
      console.log(`✅ Student found: ${studentName} (${elapsed}ms)`);
      console.log("   Attendance marked successfully\n");
    } else if (data.isDuplicate) {
      console.log(`ℹ Duplicate scan ignored (${elapsed}ms, cooldown: ${data.remainingSeconds || 10}s)\n`);
    } else if (data.reason === "CARD_NOT_REGISTERED" || data.reason === "unregistered_card" || !data.success) {
      console.log(`⚠ Card not registered: ${uid} (${elapsed}ms)`);
      console.log("   (Assign this card to a student in the admin panel)\n");
    } else {
      console.log(`ℹ Response from server (${elapsed}ms):`, data);
    }
  } catch (err) {
    console.error("❌ Railway backend unavailable");
    console.error(`   (${err.message})\n`);
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

    console.log("✔ NFC Reader connected");
    console.log("Waiting for card...\n");

    device.on("data", (data) => {
      rxBuf = Buffer.concat([rxBuf, data]);
      if (rxBuf.length > 512) {
        rxBuf = rxBuf.subarray(rxBuf.length - 256);
      }
      const { frames, rest } = parseFrames(rxBuf);
      rxBuf = rest;

      for (const f of frames) {
        if (f.cmd === 0x0083 && f.payload.length >= 4) {
          const status = f.payload.readUInt32LE(0);
          if (status === 4) {
            const detectedUid = extractUidFromPayload(f.payload);
            if (detectedUid) {
              onRealCardDetected(detectedUid);
            }
          } else {
            if (lastCardUid !== null && (Date.now() - lastScanTime) > 600) {
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
    }, POLL_INTERVAL_MS);

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

console.log("Searching for NFC reader...");
connectReader();

setInterval(() => {
  if (!isConnected) {
    connectReader();
  }
}, 1500);

process.on("SIGINT", () => {
  console.log("\nStopping NFC Agent...");
  disconnectReader();
  process.exit(0);
});
