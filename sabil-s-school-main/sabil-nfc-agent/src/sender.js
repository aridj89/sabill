import crypto from "crypto";
import { EventEmitter } from "events";

/**
 * Reliable, ordered scan sender.
 *  - Every scan gets a unique scanId; the server treats a retried scanId as idempotent,
 *    so a retry after a lost response can never create a second attendance.
 *  - Same UID within duplicateWindowMs is dropped locally (card resting on the reader).
 *  - Temporary failures (offline, 5xx, 429) are retried with exponential backoff.
 *  - A queued scan older than maxRetryAgeMs is discarded (a very late scan would be recorded
 *    with the wrong time) and the loss is logged.
 */
export class ScanSender extends EventEmitter {
  constructor({
    api,
    logger,
    duplicateWindowMs = 3000,
    maxRetryAgeMs = 5 * 60 * 1000,
    backoffBaseMs = 1000,
    backoffMaxMs = 30000,
    maxQueue = 100,
    now = () => Date.now(),
  }) {
    super();
    Object.assign(this, { api, logger, duplicateWindowMs, maxRetryAgeMs, backoffBaseMs, backoffMaxMs, maxQueue, now });
    this.queue = [];
    this.recent = new Map(); // uid -> last accepted time
    this.running = false;
    this.timer = null;
    this.stopped = false;
    this.status = { lastResult: null, lastError: null, authFailed: false, serverReachable: null };
  }

  get queueLength() {
    return this.queue.length;
  }

  /** @returns {boolean} true if queued, false if dropped as local duplicate / queue full */
  enqueue(uid) {
    const t = this.now();
    const last = this.recent.get(uid);
    if (last !== undefined && t - last < this.duplicateWindowMs) {
      this.logger.info(`Scan ${uid} ignoré (doublon local < ${this.duplicateWindowMs} ms).`);
      return false;
    }
    this.recent.set(uid, t);
    for (const [k, v] of this.recent) if (t - v > 60000) this.recent.delete(k);

    if (this.queue.length >= this.maxQueue) {
      this.logger.error(`File d'attente pleine (${this.maxQueue}) — scan ${uid} perdu.`);
      return false;
    }
    this.queue.push({ uid, scanId: crypto.randomUUID(), at: t, attempts: 0 });
    this.logger.info(`Scan ${uid} en file d'attente (${this.queue.length}).`);
    this._kick(0);
    return true;
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  _kick(delay) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._drain(), delay);
  }

  async _drain() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      while (this.queue.length && !this.stopped) {
        const item = this.queue[0];

        if (this.now() - item.at > this.maxRetryAgeMs) {
          this.logger.error(`Scan ${item.uid} abandonné (plus de ${Math.round(this.maxRetryAgeMs / 1000)} s sans réseau).`);
          this.queue.shift();
          this.emit("dropped", item);
          continue;
        }

        item.attempts += 1;
        const res = await this.api.scan({ uid: item.uid, scanId: item.scanId });

        if (res.ok) {
          this.queue.shift();
          this.status.serverReachable = true;
          this.status.authFailed = false;
          this.status.lastError = null;
          this.status.lastResult = {
            uid: item.uid,
            at: new Date().toISOString(),
            success: !!res.json.success,
            isDuplicate: !!res.json.isDuplicate,
            reason: res.json.reason || null,
            student: res.json.student ? `${res.json.student.prenom || ""} ${res.json.student.nom || ""}`.trim() : null,
            message: res.json.message || "",
          };
          this.logger.info(`Scan ${item.uid} → ${res.json.success ? "présence validée" : res.json.reason || res.json.message || "refusé"}${item.attempts > 1 ? ` (tentative ${item.attempts})` : ""}`);
          this.emit("result", this.status.lastResult);
          continue;
        }

        this.status.lastError = res.error;
        if (!res.retryable) {
          this.queue.shift();
          if (res.auth) {
            this.status.authFailed = true;
            this.logger.error(`Authentification refusée par le serveur (${res.status}) — vérifiez le jeton du poste. Scan ${item.uid} perdu.`);
          } else {
            this.logger.error(`Scan ${item.uid} rejeté par le serveur (${res.status}): ${res.error}`);
          }
          this.emit("rejected", { item, res });
          continue;
        }

        this.status.serverReachable = false;
        const delay = Math.min(this.backoffMaxMs, this.backoffBaseMs * 2 ** (item.attempts - 1));
        this.logger.warn(`Serveur injoignable (${res.error}) — nouvelle tentative dans ${Math.round(delay / 1000)} s (${this.queue.length} en attente).`);
        this.running = false;
        this._kick(delay);
        return;
      }
    } finally {
      this.running = false;
    }
  }
}
