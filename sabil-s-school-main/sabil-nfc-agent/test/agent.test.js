import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "events";
import fs from "fs";
import os from "os";
import path from "path";

import { normalizeUid, isValidUid } from "../src/uid.js";
import { createApiClient } from "../src/api.js";
import { ScanSender } from "../src/sender.js";
import { ReaderSupervisor } from "../src/reader.js";
import { normalizeApiUrl, saveSetup, loadConfig } from "../src/config.js";
import { createSecureStore } from "../src/secureStore.js";
import { Agent } from "../src/agent.js";

const silent = { info() {}, warn() {}, error() {}, file: () => "" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 2000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await sleep(10);
  }
  throw new Error("waitFor timeout");
}
const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// ── UID normalization ────────────────────────────────────────────────
test("agent UID normalization matches the server rules", () => {
  assert.equal(normalizeUid("04:aa:bb:12:34:56"), "04AABB123456");
  assert.equal(normalizeUid("04 aa-bb 12"), "04AABB12");
  assert.equal(normalizeUid(null), "");
  assert.equal(isValidUid("04AABB"), true);
  assert.equal(isValidUid("04A"), false);
  assert.equal(isValidUid("A".repeat(21)), false);
});

// ── PC/SC reader detection (fake nfc-pcsc) ───────────────────────────
function fakeNfcFactory() {
  const instances = [];
  const factory = async () => {
    const nfc = new EventEmitter();
    nfc.closed = false;
    nfc.close = () => { nfc.closed = true; };
    instances.push(nfc);
    return nfc;
  };
  return { factory, instances };
}
function fakeReader(name) {
  const r = new EventEmitter();
  r.name = name;
  return r;
}

test("reader supervisor detects reader, card scan, and disconnection", async () => {
  const { factory, instances } = fakeNfcFactory();
  const sup = new ReaderSupervisor({ logger: silent, createNfc: factory });
  const events = [];
  sup.on("reader-connected", (n) => events.push(["conn", n]));
  sup.on("reader-disconnected", (n) => events.push(["disc", n]));
  sup.on("card", (u) => events.push(["card", u]));
  await sup.start();

  const reader = fakeReader("ACS ACR122U PICC Interface 0");
  instances[0].emit("reader", reader);
  assert.deepEqual(sup.readerNames, ["ACS ACR122U PICC Interface 0"]);

  reader.emit("card", { uid: "04aabb123456" });
  reader.emit("card", { uid: "zz" }); // garbage ignored
  reader.emit("end");
  assert.deepEqual(events, [
    ["conn", "ACS ACR122U PICC Interface 0"],
    ["card", "04AABB123456"],
    ["disc", "ACS ACR122U PICC Interface 0"],
  ]);
  assert.deepEqual(sup.readerNames, []);
  sup.stop();
});

test("reader supervisor re-creates the PC/SC context after a fatal error and picks readers up again", async () => {
  const { factory, instances } = fakeNfcFactory();
  const sup = new ReaderSupervisor({ logger: silent, createNfc: factory, restartBaseMs: 10, restartMaxMs: 20 });
  const disconnected = [];
  sup.on("reader-disconnected", (n) => disconnected.push(n));
  await sup.start();
  instances[0].emit("reader", fakeReader("R1"));
  assert.equal(sup.readerNames.length, 1);

  instances[0].emit("error", new Error("SCardEstablishContext failed")); // e.g. Smart Card service restarted
  assert.equal(instances[0].closed, true);
  assert.deepEqual(disconnected, ["R1"]);
  await waitFor(() => instances.length === 2);

  instances[1].emit("reader", fakeReader("R1"));
  assert.deepEqual(sup.readerNames, ["R1"]);
  sup.stop();
});

test("reader supervisor retries when nfc-pcsc cannot be loaded", async () => {
  let attempts = 0;
  const sup = new ReaderSupervisor({
    logger: silent,
    restartBaseMs: 10,
    restartMaxMs: 20,
    createNfc: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("native module missing");
      return Object.assign(new EventEmitter(), { close() {} });
    },
  });
  await sup.start();
  await waitFor(() => attempts === 3);
  sup.stop();
});

// ── API client classification ────────────────────────────────────────
test("api client sends device auth headers and classifies failures", async () => {
  let seen;
  const mk = (impl) => createApiClient({ baseUrl: "https://x.test", deviceId: "DEV-1", token: "sdt_abc", fetchImpl: impl });

  let c = mk(async (url, opts) => { seen = { url, opts }; return jsonRes(200, { success: true }); });
  assert.equal((await c.scan({ uid: "04AABB", scanId: "s1" })).ok, true);
  assert.equal(seen.url, "https://x.test/api/nfc/scan");
  assert.equal(seen.opts.headers["X-Device-Id"], "DEV-1");
  assert.equal(seen.opts.headers["X-Device-Token"], "sdt_abc");
  assert.deepEqual(JSON.parse(seen.opts.body), { uid: "04AABB", deviceId: "DEV-1", scanId: "s1" });

  const r403 = await mk(async () => jsonRes(403, { message: "no" })).scan({ uid: "04AABB" });
  assert.deepEqual([r403.ok, r403.auth, r403.retryable], [false, true, false]);
  const r503 = await mk(async () => jsonRes(503, {})).scan({ uid: "04AABB" });
  assert.deepEqual([r503.ok, r503.retryable], [false, true]);
  const r429 = await mk(async () => jsonRes(429, {})).scan({ uid: "04AABB" });
  assert.equal(r429.retryable, true);
  const net = await mk(async () => { throw new Error("ECONNREFUSED"); }).scan({ uid: "04AABB" });
  assert.deepEqual([net.ok, net.retryable], [false, true]);
});

// ── Sender: retry, idempotency, duplicates ───────────────────────────
function mkSender(api, extra = {}) {
  return new ScanSender({ api, logger: silent, backoffBaseMs: 10, backoffMaxMs: 40, ...extra });
}

test("sender retries temporary failures with the SAME scanId, then succeeds", async () => {
  const calls = [];
  let online = false;
  const api = {
    scan: async ({ uid, scanId }) => {
      calls.push(scanId);
      return online ? { ok: true, json: { success: true, student: { prenom: "A", nom: "B" } } } : { ok: false, retryable: true, error: "offline" };
    },
  };
  const s = mkSender(api);
  s.enqueue("04AABB12");
  await waitFor(() => calls.length >= 3);
  assert.equal(s.status.serverReachable, false);
  online = true;
  await waitFor(() => s.queueLength === 0);
  assert.equal(new Set(calls).size, 1, "all retries reuse one scanId");
  assert.equal(s.status.serverReachable, true);
  assert.equal(s.status.lastResult.success, true);
  s.stop();
});

test("sender drops same-UID scans inside the duplicate window", async () => {
  const api = { scan: async () => ({ ok: true, json: { success: true } }) };
  const s = mkSender(api, { duplicateWindowMs: 500 });
  assert.equal(s.enqueue("04AABB12"), true);
  assert.equal(s.enqueue("04AABB12"), false);
  assert.equal(s.enqueue("04CCDD34"), true);
  s.stop();
});

test("sender flags auth failure and does not retry it", async () => {
  let n = 0;
  const api = { scan: async () => { n += 1; return { ok: false, status: 403, auth: true, retryable: false, error: "revoked" }; } };
  const s = mkSender(api);
  s.enqueue("04AABB12");
  await waitFor(() => s.status.authFailed);
  await sleep(60);
  assert.equal(n, 1);
  assert.equal(s.queueLength, 0);
  s.stop();
});

test("sender abandons scans older than maxRetryAgeMs", async () => {
  let t = 1000;
  const dropped = [];
  const api = { scan: async () => ({ ok: false, retryable: true, error: "offline" }) };
  const s = mkSender(api, { maxRetryAgeMs: 100, now: () => t });
  s.on("dropped", (i) => dropped.push(i.uid));
  s.enqueue("04AABB12");
  await sleep(30);
  t += 500; // time passes while offline
  await waitFor(() => dropped.length === 1);
  assert.equal(s.queueLength, 0);
  s.stop();
});

// ── Whole agent: network disconnection and recovery ──────────────────
test("agent end-to-end with fake server: heartbeat, scan, outage, recovery", async () => {
  const requests = [];
  let online = true;
  const fetchImpl = async (url, opts) => {
    if (!online) throw new Error("network down");
    const body = JSON.parse(opts.body);
    requests.push({ path: new URL(url).pathname, body, headers: opts.headers });
    if (url.endsWith("/api/nfc/scan")) return jsonRes(200, { success: true, student: { prenom: "Ali", nom: "K" } });
    return jsonRes(200, { success: true });
  };
  const { factory, instances } = fakeNfcFactory();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-e2e-"));
  const agent = new Agent({
    config: {
      apiBaseUrl: "https://sabil.test", deviceId: "DEV-1", token: "sdt_secret",
      heartbeatIntervalMs: 60000, duplicateWindowMs: 50, maxRetryAgeMs: 5000, statusPort: 0, dataDir,
    },
    logger: silent,
    fetchImpl,
    createNfc: factory,
    senderOptions: { backoffBaseMs: 10, backoffMaxMs: 40 },
  });
  await agent.start();

  // heartbeat at startup
  assert.equal(requests.at(-1).path, "/api/nfc/heartbeat");
  assert.deepEqual(requests.at(-1).body.readers, []);

  // reader plugged → immediate heartbeat lists it
  const reader = fakeReader("ACR122U");
  instances[0].emit("reader", reader);
  await waitFor(() => requests.some((r) => r.path === "/api/nfc/heartbeat" && r.body.readers.includes("ACR122U")));
  assert.deepEqual(agent.getStatus().readers, ["ACR122U"]);

  // scan while online
  reader.emit("card", { uid: "04aabb123456" });
  await waitFor(() => agent.getStatus().lastScan?.success);
  const scanReq = requests.find((r) => r.path === "/api/nfc/scan");
  assert.equal(scanReq.body.uid, "04AABB123456");
  assert.equal(scanReq.headers["X-Device-Token"], "sdt_secret");
  assert.equal(agent.getStatus().lastScan.student, "Ali K");

  // outage: scan is queued, retried, delivered after recovery
  online = false;
  await sleep(70); // outside the local duplicate window
  reader.emit("card", { uid: "04CCDD654321" });
  await waitFor(() => agent.getStatus().server.reachable === false);
  assert.equal(agent.getStatus().queueLength, 1);
  online = true;
  await waitFor(() => agent.getStatus().queueLength === 0);
  assert.equal(requests.filter((r) => r.path === "/api/nfc/scan").at(-1).body.uid, "04CCDD654321");
  assert.equal(agent.getStatus().server.reachable, true);

  await agent.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

// ── Config & secure storage ──────────────────────────────────────────
test("API URL must be HTTPS (localhost allowed for development)", () => {
  assert.equal(normalizeApiUrl("https://sabil.example.com/"), "https://sabil.example.com");
  assert.throws(() => normalizeApiUrl("http://sabil.example.com"), /HTTPS/);
  assert.equal(normalizeApiUrl("http://localhost:5000"), "http://localhost:5000");
  assert.equal(normalizeApiUrl("http://10.0.0.5:5000", { allowHttp: true }), "http://10.0.0.5:5000");
  assert.throws(() => normalizeApiUrl("not a url"));
});

test("setup stores config without the secret; token is loaded from the secure store", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-cfg-"));
  const env = { SABIL_AGENT_HOME: home };
  const token = "sdt_" + "a".repeat(43);
  saveSetup({ apiBaseUrl: "https://sabil.example.com", deviceId: "SABIL-CLIENT-01", token }, { env });
  const cfgText = fs.readFileSync(path.join(home, "config.json"), "utf8");
  assert.ok(!cfgText.includes(token), "token must not be in config.json");
  const cfg = loadConfig({ env });
  assert.equal(cfg.token, token);
  assert.equal(cfg.deviceId, "SABIL-CLIENT-01");
  assert.equal(cfg.apiBaseUrl, "https://sabil.example.com");
  // env overrides
  assert.equal(loadConfig({ env: { ...env, SABIL_DEVICE_TOKEN: "sdt_override" } }).token, "sdt_override");
  assert.throws(() => saveSetup({ apiBaseUrl: "http://evil.example.com", deviceId: "X1234", token }, { env }), /HTTPS/);
  assert.throws(() => saveSetup({ apiBaseUrl: "https://a.example.com", deviceId: "X1234", token: "bad" }, { env }), /Jeton/);
  fs.rmSync(home, { recursive: true, force: true });
});

test("incomplete config raises CONFIG_INCOMPLETE", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-empty-"));
  assert.throws(() => loadConfig({ env: { SABIL_AGENT_HOME: home } }), (e) => e.code === "CONFIG_INCOMPLETE");
  fs.rmSync(home, { recursive: true, force: true });
});

test("Windows secure store goes through DPAPI (injected runner) and never writes the clear token", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-dpapi-"));
  const calls = [];
  const runner = (script, stdin) => {
    calls.push(script.includes("Unprotect") ? "unprotect" : "protect");
    return script.includes("Unprotect") ? "sdt_clear" : "BASE64-ENCRYPTED-BLOB";
  };
  const store = createSecureStore(dir, { platform: "win32", runner });
  store.save("sdt_clear");
  assert.equal(fs.readFileSync(store.file, "utf8"), "BASE64-ENCRYPTED-BLOB");
  assert.equal(store.load(), "sdt_clear");
  assert.deepEqual(calls, ["protect", "unprotect"]);
  fs.rmSync(dir, { recursive: true, force: true });
});
