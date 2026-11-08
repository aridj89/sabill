import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

/**
 * Device-token storage.
 *  - Windows: encrypted with DPAPI (current user scope) through PowerShell — no native dependency.
 *    The file can only be decrypted by the same Windows user on the same PC.
 *  - Other OS (development only): plain file with mode 0600.
 */
const PS_PROTECT = `
Add-Type -AssemblyName System.Security
$in = [Console]::In.ReadToEnd().Trim()
$b = [System.Text.Encoding]::UTF8.GetBytes($in)
$p = [System.Security.Cryptography.ProtectedData]::Protect($b, $null, 'CurrentUser')
[Console]::Out.Write([Convert]::ToBase64String($p))
`;
const PS_UNPROTECT = `
Add-Type -AssemblyName System.Security
$in = [Console]::In.ReadToEnd().Trim()
$p = [Convert]::FromBase64String($in)
$b = [System.Security.Cryptography.ProtectedData]::Unprotect($p, $null, 'CurrentUser')
[Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($b))
`;

function runPowerShell(script, stdin) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
    { input: stdin, encoding: "utf8", windowsHide: true }
  );
  if (r.status !== 0) throw new Error(`PowerShell DPAPI failed: ${(r.stderr || "").trim() || r.status}`);
  return r.stdout.trim();
}

export function createSecureStore(dataDir, { platform = process.platform, runner = runPowerShell } = {}) {
  const file = path.join(dataDir, platform === "win32" ? "device-token.dpapi" : "device-token.dev");

  return {
    file,
    encrypted: platform === "win32",
    save(token) {
      fs.mkdirSync(dataDir, { recursive: true });
      if (platform === "win32") {
        fs.writeFileSync(file, runner(PS_PROTECT, token), "utf8");
      } else {
        fs.writeFileSync(file, token, { encoding: "utf8", mode: 0o600 });
      }
    },
    load() {
      if (!fs.existsSync(file)) return null;
      const raw = fs.readFileSync(file, "utf8").trim();
      if (!raw) return null;
      return platform === "win32" ? runner(PS_UNPROTECT, raw) : raw;
    },
  };
}
