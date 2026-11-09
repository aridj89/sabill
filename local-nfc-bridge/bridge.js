import dotenv from "dotenv";
import HID from "node-hid";
import https from "https";

dotenv.config();

const API_BASE_URL = (process.env.API_BASE_URL || "https://caring-nature-production-c5b4.up.railway.app").replace(/\/+$/, "");
const SCAN_ENDPOINT = `${API_BASE_URL}/api/nfc/scan`;
const COOLDOWN_MS = parseInt(process.env.SCAN_COOLDOWN_MS || "1500", 10);
// Hardware optimal RF polling: 250ms allows the RFID carrier anti-collision sequence to finish cleanly without packet jamming
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "250", 10);

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  timeout: 5000,
});

console.log("==================================================================");
console.log("      🚀 SABIL SCHOOL — INSTANT NFC USB BRIDGE AGENT");
console.log("==================================================================");
console.log(`🌐 Target Cloud API : ${SCAN_ENDPOINT}`);
console.log(`⚡ Poll Interval   : ${POLL_INTERVAL_MS}ms (Hardware Calibrated)`);
console.log(`⏱  Scan Cooldown   : ${COOLDOWN_MS}ms`);
console.log("==================================================================\n");

// ── State ──
let lastCardUid = null;
let lastScanTime = 0;
let isPosting = false;

// ── Post Card to Cloud API ──
async function postCardToCloud(cardUid) {
  const now = Date.now();
  if (cardUid === lastCardUid && (now - lastScanTime) < COOLDOWN_MS) {
    return;
  }
  lastCardUid = cardUid;
  lastScanTime = now;

  const t0 = performance.now();
  console.log(`⚡ [INSTANT SCAN] UID: ${cardUid} -> Envoi vers Railway...`);

  try {
    const response = await fetch(SCAN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive"
      },
      body: JSON.stringify({ cardUid, uid: cardUid }),
      agent: httpsAgent,
    });

    const elapsed = Math.round(performance.now() - t0);

    if (!response.ok) {
      console.warn(`⚠ Serveur a répondu avec le statut ${response.status} en ${elapsed}ms`);
      return;
    }

    const data = await response.json();

    if (data.success && data.student) {
      console.log(`✅ [PRÉSENCE VALIDÉE] (${elapsed}ms) Élève: ${data.student.prenom} ${data.student.nom} (${data.student.phone || "Sans téléphone"})`);
    } else if (data.isDuplicate) {
      console.log(`ℹ [DOUBLE SCAN IGNORÉ] (${elapsed}ms) ${data.message || "Déjà pointé récemment"}`);
    } else if (data.reason === "CARD_NOT_REGISTERED" || data.reason === "unregistered_card" || !data.success) {
      console.log(`⚠ [CARTE NON ATTRIBUÉE] (${elapsed}ms) ${data.message || "Carte non attribuée à un élève"}`);
    } else {
      console.log(`ℹ [RÉPONSE] (${elapsed}ms)`, data);
    }
  } catch (err) {
    console.error(`❌ Erreur réseau lors du pointage: ${err.message}`);
    console.error(`   Vérifiez que l'API est accessible sur: ${API_BASE_URL}`);
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
    
    // Safety check: 5YOA query responses are never larger than 256 bytes
    if (length > 256) {
      i++;
      continue;
    }

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

  // Pattern 1: 7-byte UID starting with 0x04 (NTAG / Ultralight)
  for (let i = 8; i <= payload.length - 7; i++) {
    if (payload[i] === 0x04) {
      const candidate = payload.subarray(i, i + 7);
      // Verify non-zero and reasonable entropy
      if (!candidate.every(b => b === 0) && !candidate.every(b => b === 0xff)) {
        return candidate.toString("hex").toUpperCase();
      }
    }
  }

  // Pattern 2: Standard 5YOA offset 40-48
  if (payload.length >= 48) {
    let uidStart = 41;
    if (payload[41] !== 0x04 && payload[42] === 0x04) uidStart = 42;
    else if (payload[40] === 0x04) uidStart = 40;
    const raw7 = payload.subarray(uidStart, uidStart + 7);
    if (!raw7.every(b => b === 0)) return raw7.toString("hex").toUpperCase();
  }

  // Pattern 3: 4-byte UID (Mifare Classic 1K)
  if (payload.length >= 44) {
    const raw4 = payload.subarray(40, 44);
    if (!raw4.every(b => b === 0) && !raw4.every(b => b === 0xff)) {
      return raw4.toString("hex").toUpperCase();
    }
  }

  return null;
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

      console.log(`✔ [5YOA HID] Lecteur connecté : ${devInfo.product || "5YOA NFC Reader"}`);

      device.on("data", (data) => {
        rxBuf = Buffer.concat([rxBuf, data]);
        
        // Prevent buffer bloat if packets are malformed
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
                if (currentCardUid !== detectedUid) {
                  currentCardUid = detectedUid;
                  postCardToCloud(detectedUid);
                }
              }
            } else {
              // Card removed
              currentCardUid = null;
            }
          }
        }
      });

      device.on("error", (err) => {
        console.warn("⚠ [5YOA HID] Erreur périphérique:", err.message);
        cleanupDevice();
      });

      // Calibrated 250ms polling: fast response (<0.3s) without jamming RF carrier
      pollTimer = setInterval(() => {
        if (!device) return;
        try {
          sendOutputReport(device, queryFrame);
        } catch {
          cleanupDevice();
        }
      }, POLL_INTERVAL_MS);

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

  const found = tryConnect();
  if (!found) {
    console.log("ℹ Lecteur 5YOA HID non détecté. En attente de connexion USB...");
  }

  setInterval(() => {
    if (!device) {
      tryConnect();
    }
  }, 1500);
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
      console.log(`✔ [PC/SC] Lecteur détecté : ${reader.name}`);

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
        console.log(`⚠ [PC/SC] Lecteur déconnecté : ${reader.name}`);
      });
    });

    pcsc.on("error", (err) => {
      console.warn("⚠ [PC/SC] Erreur PC/SC:", err.message);
    });
  } catch (_) {
    // PC/SC optional fallback
  }
}

start5YoaReader();
tryStartPcscReader();

console.log("Prêt ! Présentez une carte sur votre lecteur NFC.");
console.log("Appuyez sur Ctrl+C pour arrêter.\n");
