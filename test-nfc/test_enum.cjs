const HID = require("node-hid");

console.log("Enumerating HID devices...");
const devices = HID.devices();
console.log(`Found ${devices.length} total HID devices.`);

const nfcDevices = devices.filter(d => d.vendorId === 0x0483 && d.productId === 0x4343);
console.log("Matching NFC devices (0x0483:0x4343):", nfcDevices);
