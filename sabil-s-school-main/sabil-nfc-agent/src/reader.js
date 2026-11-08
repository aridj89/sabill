import { EventEmitter } from "events";
import { normalizeUid, isValidUid } from "./uid.js";

/**
 * PC/SC reader supervisor built on nfc-pcsc.
 *
 * Emits:
 *   "reader-connected"    (name)
 *   "reader-disconnected" (name)
 *   "card"                (uid)        normalized hex UID
 *   "error"-like problems are logged and the PC/SC context is re-created with backoff
 *   (e.g. the Windows Smart Card service restarted, or the last reader was unplugged and the
 *   context became invalid).
 *
 * `createNfc` is injectable for tests; by default nfc-pcsc is imported lazily so the rest of
 * the agent (and tests) work even where the native module is not built.
 */
export class ReaderSupervisor extends EventEmitter {
  constructor({ logger, createNfc, restartBaseMs = 2000, restartMaxMs = 30000 }) {
    super();
    this.logger = logger;
    this.createNfc = createNfc || defaultCreateNfc;
    this.restartBaseMs = restartBaseMs;
    this.restartMaxMs = restartMaxMs;
    this.readers = new Set();
    this.nfc = null;
    this.failures = 0;
    this.timer = null;
    this.stopped = false;
    this.lastError = null;
  }

  get readerNames() {
    return [...this.readers];
  }

  async start() {
    this.stopped = false;
    await this._open();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this._close();
  }

  async _open() {
    if (this.stopped) return;
    try {
      this.nfc = await this.createNfc();
    } catch (err) {
      this.lastError = `Impossible de charger nfc-pcsc : ${err.message}`;
      this.logger.error(this.lastError);
      return this._scheduleRestart();
    }

    this.nfc.on("reader", (reader) => {
      const name = reader.name;
      this.logger.info(`Lecteur connecté : ${name}`);
      this.readers.add(name);
      this.failures = 0;
      this.lastError = null;
      this.emit("reader-connected", name);

      reader.on("card", (card) => {
        const uid = normalizeUid(card && card.uid);
        if (!isValidUid(uid)) {
          this.logger.warn(`Carte ignorée sur ${name} : UID illisible (${card && card.uid}).`);
          return;
        }
        this.emit("card", uid);
      });

      reader.on("error", (err) => {
        this.lastError = `${name}: ${err && err.message ? err.message : err}`;
        this.logger.warn(`Erreur lecteur ${lastLine(this.lastError)}`);
      });

      reader.on("end", () => {
        this.logger.warn(`Lecteur déconnecté : ${name}`);
        this.readers.delete(name);
        this.emit("reader-disconnected", name);
      });
    });

    this.nfc.on("error", (err) => {
      this.lastError = err && err.message ? err.message : String(err);
      this.logger.error(`Erreur PC/SC : ${this.lastError} — réinitialisation.`);
      this._resetAfterFatal();
    });

    this.logger.info("Surveillance des lecteurs PC/SC démarrée.");
  }

  _resetAfterFatal() {
    for (const name of [...this.readers]) {
      this.readers.delete(name);
      this.emit("reader-disconnected", name);
    }
    this._close();
    this._scheduleRestart();
  }

  _close() {
    try {
      this.nfc?.close?.();
    } catch {
      // ignore
    }
    this.nfc = null;
  }

  _scheduleRestart() {
    if (this.stopped || this.timer) return;
    this.failures += 1;
    const delay = Math.min(this.restartMaxMs, this.restartBaseMs * 2 ** (this.failures - 1));
    this.logger.warn(`Nouvelle tentative PC/SC dans ${Math.round(delay / 1000)} s.`);
    this.timer = setTimeout(() => {
      this.timer = null;
      this._open();
    }, delay);
  }
}

function lastLine(s) {
  return String(s).split("\n")[0];
}

async function defaultCreateNfc() {
  const mod = await import("nfc-pcsc");
  const NFC = mod.NFC || mod.default?.NFC;
  return new NFC();
}
