import http from "http";

console.log("Connecting to SSE stream at http://localhost:5000/api/nfc/stream ...");

const req = http.get("http://localhost:5000/api/nfc/stream", (res) => {
  console.log("SSE HTTP Status:", res.statusCode);
  console.log("Headers:", res.headers["content-type"]);

  res.on("data", (chunk) => {
    const text = chunk.toString();
    console.log("Received SSE chunk:\n", text);
    if (text.includes("connected") || text.includes("readerStatus")) {
      console.log("✔ SSE stream working and verified!");
      req.destroy();
      process.exit(0);
    }
  });
});

req.on("error", (err) => {
  console.error("SSE request error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("Timeout waiting for SSE.");
  req.destroy();
  process.exit(0);
}, 3000);
