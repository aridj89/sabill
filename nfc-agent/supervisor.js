import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import net from "net";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, "agent.log");
const ENTRY = path.join(__dirname, "agent.js");
const SINGLE_INSTANCE_PORT = 51820;

function trimLogIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > 2 * 1024 * 1024) {
        const buf = fs.readFileSync(LOG_FILE);
        fs.writeFileSync(LOG_FILE, buf.subarray(buf.length - 500 * 1024));
      }
    }
  } catch (_) {}
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  trimLogIfNeeded();
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (_) {}
}

function appendToLog(data) {
  trimLogIfNeeded();
  try {
    fs.appendFileSync(LOG_FILE, data);
  } catch (_) {}
}

let child = null;
let restartAttempts = 0;
let lastStartTime = Date.now();

function startAgent() {
  lastStartTime = Date.now();
  log(`Spawning NFC worker: ${ENTRY}`);

  child = spawn(process.execPath, [ENTRY], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (d) => appendToLog(d));
  child.stderr.on("data", (d) => appendToLog(d));

  child.on("exit", (code, signal) => {
    const uptime = Date.now() - lastStartTime;
    log(`Worker exited with code ${code}, signal ${signal} (uptime: ${Math.round(uptime / 1000)}s)`);
    child = null;

    if (uptime > 60000) {
      restartAttempts = 0;
    } else {
      restartAttempts++;
    }

    const delay = Math.min(30000, 2000 * Math.pow(1.5, Math.min(restartAttempts, 8)));
    log(`Auto-restarting in ${Math.round(delay / 1000)}s (Attempt #${restartAttempts})...`);
    setTimeout(startAgent, delay);
  });

  child.on("error", (err) => {
    log(`Failed to start child process: ${err.message}`);
  });
}

// Single instance check via loopback socket
const lockServer = net.createServer();
lockServer.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    log("Another instance of Sabil NFC Supervisor is already running. Exiting duplicate process.");
    process.exit(0);
  } else {
    log(`Lock server error: ${err.message}. Continuing anyway.`);
    startAgent();
  }
});

lockServer.listen(SINGLE_INSTANCE_PORT, "127.0.0.1", () => {
  log("=== Sabil NFC Supervisor started (lock acquired) ===");
  startAgent();
});

process.on("SIGINT", () => {
  log("Supervisor stopping (SIGINT)...");
  if (child) child.kill();
  try { lockServer.close(); } catch (_) {}
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("Supervisor stopping (SIGTERM)...");
  if (child) child.kill();
  try { lockServer.close(); } catch (_) {}
  process.exit(0);
});
