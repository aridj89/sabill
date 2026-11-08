import fs from "fs";
import path from "path";

const MAX_BYTES = 1024 * 1024; // rotate agent.log at 1 MB (keeps agent.log.1)

/**
 * Minimal file + console logger. Never logs the device token.
 */
export function createLogger(dataDir, { console: toConsole = true } = {}) {
  let logFile = null;
  try {
    fs.mkdirSync(path.join(dataDir, "logs"), { recursive: true });
    logFile = path.join(dataDir, "logs", "agent.log");
  } catch {
    logFile = null;
  }

  const write = (level, msg) => {
    const line = `${new Date().toISOString()} [${level}] ${msg}`;
    if (toConsole) (level === "ERROR" ? console.error : console.log)(line);
    if (!logFile) return;
    try {
      if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_BYTES) {
        fs.renameSync(logFile, `${logFile}.1`);
      }
      fs.appendFileSync(logFile, line + "\n");
    } catch {
      // logging must never crash the agent
    }
  };

  return {
    info: (m) => write("INFO", m),
    warn: (m) => write("WARN", m),
    error: (m) => write("ERROR", m),
    file: () => logFile,
  };
}
