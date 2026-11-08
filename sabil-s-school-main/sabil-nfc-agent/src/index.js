import fs from "fs";
import path from "path";
import readline from "readline";
import { loadConfig, saveSetup, getDataDir, AGENT_VERSION } from "./config.js";
import { createLogger } from "./logger.js";
import { Agent } from "./agent.js";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function ask(rl, q) {
  return new Promise((r) => rl.question(q, r));
}

async function runSetup() {
  let values;
  const file = flag("--setup-from-file");
  if (file) {
    // Used by the installer: values handed over in a temp file (deleted right after reading),
    // so the token never appears on a command line.
    values = JSON.parse(fs.readFileSync(file, "utf8"));
    try { fs.unlinkSync(file); } catch { /* ignore */ }
  } else if (flag("--url") && flag("--device-id") && flag("--token")) {
    values = { apiBaseUrl: flag("--url"), deviceId: flag("--device-id"), token: flag("--token") };
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    values = {
      apiBaseUrl: await ask(rl, "URL du site Sabil (https://…) : "),
      deviceId: await ask(rl, "Identifiant du poste (ex. SABIL-CLIENT-01) : "),
      token: await ask(rl, "Jeton du poste (sdt_…) : "),
    };
    rl.close();
  }
  const { dataDir, configFile } = saveSetup({
    apiBaseUrl: values.apiBaseUrl?.trim(),
    deviceId: values.deviceId?.trim(),
    token: values.token?.trim(),
  });
  console.log(`Configuration enregistrée dans ${configFile} (jeton chiffré dans ${dataDir}).`);
}

async function runAgent() {
  const dataDir = getDataDir();
  const logger = createLogger(dataDir);
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    logger.error(err.message);
    process.exit(err.code === "CONFIG_INCOMPLETE" ? 78 : 1); // 78 = EX_CONFIG: supervisor must not loop
  }

  const agent = new Agent({ config, logger });
  try {
    await agent.start();
  } catch (err) {
    if (err.code === "EADDRINUSE") {
      logger.warn(`Une autre instance de l'agent est déjà en cours (port ${config.statusPort}). Arrêt.`);
      process.exit(0);
    }
    logger.error(`Démarrage impossible : ${err.stack || err.message}`);
    process.exit(1);
  }

  fs.writeFileSync(path.join(dataDir, "agent.pid"), String(process.pid));
  const shutdown = async (sig) => {
    logger.info(`Arrêt de l'agent (${sig}).`);
    await agent.stop();
    try { fs.unlinkSync(path.join(dataDir, "agent.pid")); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("uncaughtException", (err) => {
    logger.error(`Exception non gérée : ${err.stack || err.message}`);
    process.exit(1);
  });
  process.on("unhandledRejection", (err) => {
    logger.error(`Promesse rejetée : ${err && err.stack ? err.stack : err}`);
  });
}

if (args.includes("--version")) {
  console.log(AGENT_VERSION);
} else if (args.includes("--setup") || args.includes("--setup-from-file")) {
  runSetup().catch((e) => {
    console.error(`Échec de la configuration : ${e.message}`);
    process.exit(1);
  });
} else {
  runAgent();
}
