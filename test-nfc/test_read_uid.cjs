const HID = require("node-hid");

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

async function run() {
  console.log("Searching for 5YOA NFC device (0x0483:0x4343)...");
  const devices = HID.devices().filter(d => d.vendorId === 0x0483 && d.productId === 0x4343);
  if (devices.length === 0) {
    console.error("Device not found!");
    return;
  }

  const devInfo = devices[0];
  console.log("Found device:", devInfo.path);

  let device;
  try {
    device = new HID.HID(devInfo.path);
    console.log("Successfully opened HID device!");
  } catch (err) {
    console.error("Failed to open device:", err.message);
    if (err.message.includes("sharing") || err.message.includes("cannot open")) {
      console.log("Note: If Cyb_Nfctool is currently open, it might hold an exclusive handle. Try closing it.");
    }
    return;
  }

  let rxBuf = Buffer.alloc(0);
  device.on("data", (data) => {
    rxBuf = Buffer.concat([rxBuf, data]);
    const { frames, rest } = parseFrames(rxBuf);
    rxBuf = rest;
    for (const f of frames) {
      console.log(`[RX Frame] cmd=0x${f.cmd.toString(16).padStart(4, "0")} len=${f.payload.length} ok=${f.ok}`);
      console.log(`[RX Payload Hex]: ${f.payload.toString("hex")}`);
      
      if (f.cmd === 0x0083 && f.payload.length >= 4) {
        const status = f.payload.readUInt32LE(0);
        console.log(`Status dword: ${status}`);
        if (status === 4 && f.payload.length >= 64) {
          const tagType = f.payload.readUInt32LE(4);
          const readToken = f.payload.subarray(56, 64);
          console.log(`-> NTAG detected! Type=${tagType}, readToken=${readToken.toString("hex")}`);
          
          // Let's also inspect the rest of payload (bytes 8 to 56) to see if UID is already there!
          console.log(`Payload 8..56: ${f.payload.subarray(8, 56).toString("hex")}`);
          
          // Request Page Read to get UID (READ-ONLY: Pages 0 and 1)
          const readReqPayload = Buffer.concat([readToken, Buffer.from([tagType]), Buffer.alloc(7)]);
          const readFrame = makeFrame(0x0081, readReqPayload);
          sendFrame(device, readFrame);
        } else {
          console.log("No card present or not recognized yet (status=" + status + ").");
        }
      } else if (f.cmd === 0x0085 && f.payload.length === 6) {
        const page = f.payload[0];
        const state = f.payload[1];
        const data = f.payload.subarray(2, 6);
        console.log(`[Page ${page}] state=${state} data=${data.toString("hex")}`);
      } else if (f.cmd === 0x0081 && f.payload.length >= 0x404) {
        console.log("Full read dump received! Extracting UID from pages 0 & 1:");
        // Page 0: bytes 4..8 (UID0, UID1, UID2, BCC0)
        // Page 1: bytes 8..12 (UID3, UID4, UID5, UID6)
        const p0 = f.payload.subarray(4, 8);
        const p1 = f.payload.subarray(8, 12);
        const uid = Buffer.concat([p0.subarray(0, 3), p1]);
        console.log(`=========================================`);
        console.log(`SUCCESS! Read Card UID: ${uid.toString("hex").toUpperCase()}`);
        console.log(`=========================================`);
        setTimeout(() => process.exit(0), 500);
      }
    }
  });

  device.on("error", (err) => {
    console.error("HID Device error:", err);
  });

  function sendFrame(dev, frame) {
    const REPORT_SIZE = 64;
    for (let offset = 0; offset < frame.length; offset += REPORT_SIZE) {
      const chunk = frame.subarray(offset, offset + REPORT_SIZE);
      const padded = Buffer.alloc(REPORT_SIZE, 0);
      chunk.copy(padded);
      // On Windows, node-hid write often prepends 0x00 report ID or uses 64 bytes
      try {
        dev.write(Buffer.concat([Buffer.from([0x00]), padded]));
      } catch (e) {
        dev.write(padded);
      }
    }
  }

  // Send NTAG Info query command (0x0083)
  console.log("Querying reader for NTAG card presence (cmd 0x0083)...");
  const infoPayload = Buffer.from([1, 1, 0, 0, 0, 0]);
  const infoFrame = makeFrame(0x0083, infoPayload);
  sendFrame(device, infoFrame);

  setTimeout(() => {
    console.log("Timeout waiting for response. Exiting.");
    device.close();
    process.exit(0);
  }, 4000);
}

run().catch(console.error);
