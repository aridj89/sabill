<#
  Builds SabilNfcAgentSetup.exe — run on Windows x64.
  Prerequisites (build machine only, NOT the client PC):
    - Node.js 22 LTS x64 (this exact node.exe is bundled in the installer, so the native
      module ABI always matches)
    - Visual Studio Build Tools ("Desktop development with C++") + Python 3 for node-gyp
    - Inno Setup 6  (ISCC.exe on PATH or in %ProgramFiles(x86)%\Inno Setup 6)
  Usage:  powershell -ExecutionPolicy Bypass -File installer\build-windows.ps1
#>
$ErrorActionPreference = "Stop"
$root  = Resolve-Path "$PSScriptRoot\.."
$stage = Join-Path $root "build\stage"

Write-Host "==> Cleaning $stage"
if (Test-Path "$root\build") { Remove-Item "$root\build" -Recurse -Force }
New-Item -ItemType Directory -Force "$stage\app", "$stage\node" | Out-Null

Write-Host "==> Copying agent sources"
Copy-Item "$root\src" "$stage\app\src" -Recurse
Copy-Item "$root\package.json" "$stage\app\"
Copy-Item "$root\package-lock.json" "$stage\app\"

Write-Host "==> Installing production dependencies (compiles @pokusew/pcsclite for this Node)"
Push-Location "$stage\app"
npm ci --omit=dev
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
npm rebuild @pokusew/pcsclite
if ($LASTEXITCODE -ne 0) { throw "native build of @pokusew/pcsclite failed" }
# smoke test: the native module must load
node -e "import('nfc-pcsc').then(()=>console.log('nfc-pcsc OK'))"
if ($LASTEXITCODE -ne 0) { throw "nfc-pcsc does not load" }
Pop-Location

Write-Host "==> Bundling node.exe"
Copy-Item (Get-Command node).Source "$stage\node\node.exe"

$version = (Get-Content "$root\package.json" | ConvertFrom-Json).version
$iscc = (Get-Command ISCC.exe -ErrorAction SilentlyContinue).Source
if (-not $iscc) { $iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe" }
Write-Host "==> Building installer ($version) with $iscc"
& $iscc "/DAppVersion=$version" "$PSScriptRoot\installer.iss"
if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed" }
Write-Host "==> Done: $root\dist\SabilNfcAgentSetup.exe"
