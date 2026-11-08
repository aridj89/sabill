import fs from "fs";
import os from "os";
import path from "path";
import { createSecureStore } from "./secureStore.js";

export const AGENT_VERSION = "1.0.0";

export function getDataDir(env = process.env, platform = process.platform) {
  if (env.SABIL_AGENT_HOME) return env.SABIL_AGENT_HOME;
  if (platform === "win32") {
    return path.join(env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "SabilNfcAgent");
  }
  return path.join(os.homedir(), ".sabil-nfc-agent");
}

const DEFAULTS = {
  heartbeatIntervalMs: 15000,
  duplicateWindowMs: 3000,
  maxRetryAgeMs: 5 * 60 * 1000,
  statusPort: 47800,
};

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Validate and normalize the API base URL. HTTPS is mandatory except for localhost
 * (development) or when SABIL_ALLOW_HTTP=1 is explicitly set.
 */
export function normalizeApiUrl(raw, { allowHttp = false } = {}) {
  let u;
  try {
    u = new URL(String(raw || "").trim());
  } catch {
    throw new Error("apiBaseUrl invalide (ex. https://sabil.example.com).");
  }
  if (u.protocol !== "https:" && !(u.protocol === "http:" && (allowHttp || isLocalHost(u.hostname)))) {
    throw new Error("apiBaseUrl doit utiliser HTTPS.");
  }
  return u.origin + u.pathname.replace(/\/+$/, "");
}

/**
 * Configuration precedence: environment variables > config.json > defaults.
 *   SABIL_API_URL, SABIL_DEVICE_ID, SABIL_DEVICE_TOKEN, SABIL_STATUS_PORT, SABIL_ALLOW_HTTP
 * The token comes from SABIL_DEVICE_TOKEN or the secure store — never from config.json.
 */
export function loadConfig({ env = process.env, platform = process.platform } = {}) {
  const dataDir = getDataDir(env, platform);
  const configFile = path.join(dataDir, "config.json");
  let fileCfg = {};
  if (fs.existsSync(configFile)) {
    try {
      fileCfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
    } catch (e) {
      throw new Error(`config.json illisible (${configFile}): ${e.message}`);
    }
  }

  const apiBaseUrl = env.SABIL_API_URL || fileCfg.apiBaseUrl;
  const deviceId = env.SABIL_DEVICE_ID || fileCfg.deviceId;
  const store = createSecureStore(dataDir, { platform });
  const token = env.SABIL_DEVICE_TOKEN || store.load();

  const missing = [];
  if (!apiBaseUrl) missing.push("apiBaseUrl (SABIL_API_URL)");
  if (!deviceId) missing.push("deviceId (SABIL_DEVICE_ID)");
  if (!token) missing.push("device token (SABIL_DEVICE_TOKEN ou --setup)");
  if (missing.length) {
    const err = new Error(`Configuration incomplète : ${missing.join(", ")}. Lancez la configuration (--setup).`);
    err.code = "CONFIG_INCOMPLETE";
    throw err;
  }

  return {
    ...DEFAULTS,
    ...fileCfg,
    statusPort: Number(env.SABIL_STATUS_PORT) || fileCfg.statusPort || DEFAULTS.statusPort,
    apiBaseUrl: normalizeApiUrl(apiBaseUrl, { allowHttp: env.SABIL_ALLOW_HTTP === "1" }),
    deviceId,
    token,
    dataDir,
    configFile,
    tokenStore: store,
  };
}

/** First-time setup: writes config.json (no secret) and stores the token securely. */
export function saveSetup({ apiBaseUrl, deviceId, token }, { env = process.env, platform = process.platform } = {}) {
  const dataDir = getDataDir(env, platform);
  const url = normalizeApiUrl(apiBaseUrl, { allowHttp: env.SABIL_ALLOW_HTTP === "1" });
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(deviceId || "")) throw new Error("deviceId invalide.");
  if (!/^sdt_[A-Za-z0-9_-]{20,100}$/.test(token || "")) throw new Error("Jeton invalide (doit commencer par sdt_).");
  fs.mkdirSync(dataDir, { recursive: true });
  const configFile = path.join(dataDir, "config.json");
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(configFile, "utf8")); } catch { /* new file */ }
  fs.writeFileSync(configFile, JSON.stringify({ ...existing, apiBaseUrl: url, deviceId }, null, 2));
  createSecureStore(dataDir, { platform }).save(token);
  return { dataDir, configFile };
}
