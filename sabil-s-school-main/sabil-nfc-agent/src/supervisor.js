import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDataDir } from "./config.js";
import { createLogger } from "./logger.js";

/**
 * Keeps the agent alive: restarts it after a crash (with backoff), but not when it exits
 * cleanly (0) or because the configuration is missing (78). Writes supervisor.pid so the
 * "Stop" shortcut can terminate the whole process tree.
 */
const dataDir = getDataDir();
const logger = createLogger(dataDir);
const entry = path.join(path.dirname(fileURLToPath(import.meta.url)), "index.js");
const pidFile = path.join(dataDir, "supervisor.pid");

fs.mkdirSync(dataDir, { recursive: true });

// Single instance: if a supervisor from a previous start is still alive, do nothing.
try {
  const existing = parseInt(fs.readFileSync(pidFile, "utf8"), 10);
  if (existing && existing !== process.pid) {
    process.kill(existing, 0); // throws if the process does not exist
    console.log(`Superviseur déjà actif (PID ${existing}).`);
    process.exit(0);
  }
} catch {
  // no pid file, or stale pid → continue
}
fs.writeFileSync(pidFile, String(process.pid));

let child = null;
let stopping = false;
let failures = 0;

function launch() {
  const startedAt = Date.now();
  child = spawn(process.execPath, [entry], { stdio: "ignore", windowsHide: true });
  child.on("exit", (code) => {
    child = null;
    if (stopping) return;
    if (code === 0 || code === 78) {
      logger.info(`Agent terminé (code ${code}) — le superviseur s'arrête.`);
      cleanup();
      return;
    }
    failures = Date.now() - startedAt > 60000 ? 1 : failures + 1;
    const delay = Math.min(60000, 2000 * 2 ** (failures - 1));
    logger.warn(`Agent arrêté (code ${code}) — redémarrage dans ${Math.round(delay / 1000)} s.`);
    setTimeout(launch, delay);
  });
}

function cleanup() {
  try { fs.unlinkSync(pidFile); } catch { /* ignore */ }
  process.exit(0);
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    stopping = true;
    if (child) child.kill();
    cleanup();
  });
}

logger.info("Superviseur démarré.");
launch();
