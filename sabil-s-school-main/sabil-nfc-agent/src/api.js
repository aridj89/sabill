import { AGENT_VERSION } from "./config.js";

/**
 * Thin HTTPS client for the hosted Sabil API. Authenticates every request with the
 * per-device token (X-Device-Id / X-Device-Token). Classifies failures so callers know
 * whether to retry:
 *   { ok:true, json }                    success
 *   { ok:false, retryable:true, ... }    network error, timeout, 5xx, 429 → retry later
 *   { ok:false, retryable:false, auth }  400/401/403/404 → retrying cannot help
 */
export function createApiClient({ baseUrl, deviceId, token, fetchImpl = fetch, timeoutMs = 10000 }) {
  const headers = {
    "Content-Type": "application/json",
    "X-Device-Id": deviceId,
    "X-Device-Token": token,
    "User-Agent": `sabil-nfc-agent/${AGENT_VERSION}`,
  };

  async function request(path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(baseUrl + path, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, status: res.status, json };
      const auth = res.status === 401 || res.status === 403;
      const retryable = res.status >= 500 || res.status === 429 || res.status === 408;
      return { ok: false, status: res.status, json, auth, retryable, error: json.message || `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, retryable: true, auth: false, error: err.name === "AbortError" ? "timeout" : err.message };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    scan: ({ uid, scanId }) => request("/api/nfc/scan", { uid, deviceId, scanId }),
    heartbeat: ({ readers, hostname }) =>
      request("/api/nfc/heartbeat", { readers, hostname, version: AGENT_VERSION }),
  };
}
