import http from "http";

/**
 * Local status page for the client (127.0.0.1 only, read-only, no secrets):
 *   GET /        human-readable page (auto-refresh)
 *   GET /status  JSON
 */
export function createStatusServer({ getStatus, port, logger }) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const server = http.createServer((req, res) => {
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    const st = getStatus();
    if (req.url === "/status") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(st, null, 2));
      return;
    }
    if (req.url === "/" || req.url === "/index.html") {
      const dot = (ok) => `<span style="color:${ok ? "#16a34a" : "#dc2626"}">●</span>`;
      const readers = st.readers.length ? st.readers.map(esc).join("<br>") : "Aucun lecteur détecté";
      const last = st.lastScan
        ? `${esc(st.lastScan.at)}<br>UID ${esc(st.lastScan.uid)} — ${esc(st.lastScan.student || st.lastScan.reason || st.lastScan.message)}`
        : "Aucun scan";
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="5">
<title>Sabil NFC Agent</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#111}
td{padding:6px 12px 6px 0;vertical-align:top}h1{font-size:20px}small{color:#666}</style></head><body>
<h1>Sabil NFC Agent <small>v${esc(st.version)}</small></h1>
<table>
<tr><td>${dot(true)} Agent</td><td>En cours d'exécution depuis ${esc(st.startedAt)}</td></tr>
<tr><td>${dot(st.server.reachable === true && !st.server.authFailed)} Serveur</td><td>${esc(st.apiBaseUrl)}<br>${
        st.server.authFailed ? "Authentification refusée — jeton invalide ou révoqué" :
        st.server.reachable === null ? "Connexion en cours…" : st.server.reachable ? "Connecté" : "Injoignable : " + esc(st.server.lastError)
      }</td></tr>
<tr><td>${dot(st.readers.length > 0)} Lecteur</td><td>${readers}</td></tr>
<tr><td>Poste</td><td>${esc(st.deviceId)}</td></tr>
<tr><td>En attente</td><td>${st.queueLength} scan(s)</td></tr>
<tr><td>Dernier scan</td><td>${last}</td></tr>
<tr><td>Journal</td><td><small>${esc(st.logFile)}</small></td></tr>
</table></body></html>`);
      return;
    }
    res.writeHead(404).end();
  });

  return {
    start() {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.off("error", reject);
          logger.info(`Page d'état : http://127.0.0.1:${server.address().port}/`);
          resolve(server.address().port);
        });
      });
    },
    stop: () => new Promise((r) => server.close(() => r())),
  };
}
