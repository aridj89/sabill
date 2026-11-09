@echo off
title Sabil NFC Agent - Verification du Statut
cd /d "%~dp0"
echo ===================================================
echo   Sabil School - Verification NFC en arriere-plan
echo ===================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*bridge.js*' -or $_.CommandLine -like '*supervisor.js*' }; if ($procs) { Write-Host '[STATUT] L agent tourne bien en arriere-plan (PID: ' ($procs.ProcessId -join ', ') ')' -ForegroundColor Green } else { Write-Host '[STATUT] L agent est arrete.' -ForegroundColor Red }"
echo.
if exist agent.log (
    echo --- Dernieres lignes de agent.log ---
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content agent.log -Tail 10"
) else (
    echo (Aucun fichier log pour l instant)
)
echo.
pause
