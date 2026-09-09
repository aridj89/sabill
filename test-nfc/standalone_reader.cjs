const HID = require("node-hid");

const VENDOR_ID = 0x0483;
const PRODUCT_ID = 0x4343;

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

function getCardTypeName(typeCode) {
  switch (typeCode) {
    case 3: return "NTAG210 / NTAG212";
    case 4: return "NTAG213";
    case 5: return "NTAG215";
    case 6: return "NTAG216";
    default: return `NTAG Type ${typeCode}`;
  }
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

console.log("==========================================================");
console.log("  5YOA NFCSCM Hardware NFC Reader Test (STRICTLY READ-ONLY)");
console.log("  Target Device: VID 0x0483 | PID 0x4343 | Interface 1");
console.log("==========================================================");

const allDevices = HID.devices();
const matches = allDevices.filter(d => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID);

if (matches.length === 0) {
  console.error("❌ ERROR: 5YOA NFC Reader not found! Please check USB connection.");
  process.exit(1);
}

const devInfo = matches.find(d => d.interface === 1) || matches[0];
console.log(`✔ Reader detected on Windows:`);
console.log(`   - Manufacturer : ${devInfo.manufacturer || "CYBDZKJ-BSJ"}`);
console.log(`   - Product      : ${devInfo.product || "TCC-TSY-TBY"}`);
console.log(`   - Serial       : ${devInfo.serialNumber || "BEGIN-2025"}`);
console.log(`   - Interface    : ${devInfo.interface}`);
console.log(`   - Path         : ${devInfo.path}`);

let device;
try {
  device = new HID.HID(devInfo.path);
  console.log("✔ Successfully opened USB HID handle.");
} catch (err) {
  console.error("❌ Failed to open HID device:", err.message);
  console.error("   If Cyb_Nfctool is open, please close it so Node.js can access the reader.");
  process.exit(1);
}

console.log("\n📡 Continuous listening active. Ready for cards!");
console.log("👉 Place your NTAG215 card on the reader (or remove and replace it)...\n");

let rxBuf = Buffer.alloc(0);
let currentCardUid = null;

device.on("data", (data) => {
  rxBuf = Buffer.concat([rxBuf, data]);
  const { frames, rest } = parseFrames(rxBuf);
  rxBuf = rest;

  for (const f of frames) {
    if (f.cmd === 0x0083 && f.payload.length >= 4) {
      const status = f.payload.readUInt32LE(0);

      if (status === 4 && f.payload.length >= 49) {
        const tagTypeCode = f.payload.readUInt32LE(4);
        const cardTypeName = getCardTypeName(tagTypeCode);

        // Find the 7-byte UID starting with 0x04 (standard NXP manufacturer byte for NTAG)
        let uidStart = 41;
        if (f.payload[41] !== 0x04 && f.payload[42] === 0x04) {
          uidStart = 42;
        } else if (f.payload[40] === 0x04) {
          uidStart = 40;
        }

        const rawUid = f.payload.subarray(uidStart, uidStart + 7);
        const uidHex = rawUid.toString("hex").toUpperCase();

        if (currentCardUid !== uidHex) {
          currentCardUid = uidHex;
          const timeStr = new Date().toLocaleTimeString("fr-FR");
          console.log(`----------------------------------------------------------`);
          console.log(`🟢 [CARD DETECTED] at ${timeStr}`);
          console.log(`   Card Type : ${cardTypeName}`);
          console.log(`   Card UID  : ${uidHex}`);
          console.log(`   Length    : ${rawUid.length} bytes (7 bytes ISO14443-A)`);
          console.log(`   Operation : Query Only (0 modifications made)`);
          console.log(`----------------------------------------------------------`);
          console.log(`(You can remove the card to test removal, then place it again)\n`);
        }
      } else {
        // No card on reader
        if (currentCardUid !== null) {
          const timeStr = new Date().toLocaleTimeString("fr-FR");
          console.log(`⚪ [CARD REMOVED] at ${timeStr} -> Ready for next card...\n`);
          currentCardUid = null;
        }
      }
    }
  }
});

device.on("error", (err) => {
  console.error("❌ USB HID device error:", err.message);
});

// Periodic read query (strictly non-destructive command 0x0083)
const queryPayload = Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
const queryFrame = makeFrame(0x0083, queryPayload);

const pollInterval = setInterval(() => {
  try {
    sendOutputReport(device, queryFrame);
  } catch (err) {
    console.error("Poll error:", err.message);
  }
}, 300);

process.on("SIGINT", () => {
  console.log("\nStopping NFC reader listener...");
  clearInterval(pollInterval);
  try { device.close(); } catch (_) {}
  process.exit(0);
});
