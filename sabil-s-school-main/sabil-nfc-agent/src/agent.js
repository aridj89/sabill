import os from "os";
import { AGENT_VERSION } from "./config.js";
import { createApiClient } from "./api.js";
import { ScanSender } from "./sender.js";
import { ReaderSupervisor } from "./reader.js";
import { createStatusServer } from "./statusServer.js";

/**
 * Wires reader → sender → API, heartbeat and local status page.
 * Dependencies (fetch, nfc factory, timings) are injectable for tests.
 */
export class Agent {
  constructor({ config, logger, fetchImpl, createNfc, senderOptions = {}, readerOptions = {} }) {
    this.config = config;
    this.logger = logger;
    this.startedAt = new Date().toISOString();
    this.api = createApiClient({
      baseUrl: config.apiBaseUrl,
      deviceId: config.deviceId,
      token: config.token,
      fetchImpl,
    });
    this.sender = new ScanSender({
      api: this.api,
      logger,
      duplicateWindowMs: config.duplicateWindowMs,
      maxRetryAgeMs: config.maxRetryAgeMs,
      ...senderOptions,
    });
    this.reader = new ReaderSupervisor({ logger, createNfc, ...readerOptions });
    this.statusServer = createStatusServer({ getStatus: () => this.getStatus(), port: config.statusPort, logger });
    this.heartbeatTimer = null;
    this.heartbeat = { lastAt: null, lastError: null };
    this.logFile = logger.file?.() || "";
  }

  async start() {
    this.statusPort = await this.statusServer.start(); // throws EADDRINUSE if already running

    this.reader.on("card", (uid) => this.sender.enqueue(uid));
    this.reader.on("reader-connected", () => this.sendHeartbeat());
    this.reader.on("reader-disconnected", () => this.sendHeartbeat());

    await this.reader.start();
    await this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.config.heartbeatIntervalMs);
    this.logger.info(`Agent ${AGENT_VERSION} démarré — poste ${this.config.deviceId} → ${this.config.apiBaseUrl}`);
  }

  async sendHeartbeat() {
    const res = await this.api.heartbeat({ readers: this.reader.readerNames, hostname: os.hostname() });
    if (res.ok) {
      this.heartbeat = { lastAt: new Date().toISOString(), lastError: null };
      this.sender.status.serverReachable = true;
      this.sender.status.authFailed = false;
    } else {
      this.heartbeat.lastError = res.error;
      this.sender.status.serverReachable = false;
      if (res.auth) {
        this.sender.status.authFailed = true;
        this.logger.error(`Heartbeat refusé (${res.status}) — jeton invalide ou révoqué.`);
      } else {
        this.logger.warn(`Heartbeat échoué : ${res.error}`);
      }
      this.sender.status.lastError = res.error;
    }
    return res;
  }

  getStatus() {
    const s = this.sender.status;
    return {
      version: AGENT_VERSION,
      startedAt: this.startedAt,
      deviceId: this.config.deviceId,
      apiBaseUrl: this.config.apiBaseUrl,
      readers: this.reader.readerNames,
      readerError: this.reader.lastError,
      queueLength: this.sender.queueLength,
      lastScan: s.lastResult,
      server: {
        reachable: s.serverReachable,
        authFailed: s.authFailed,
        lastError: s.lastError,
        lastHeartbeatAt: this.heartbeat.lastAt,
      },
      logFile: this.logFile,
    };
  }

  async stop() {
    clearInterval(this.heartbeatTimer);
    this.sender.stop();
    this.reader.stop();
    await this.statusServer.stop();
  }
}
