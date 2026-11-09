@echo off
title Sabil NFC Agent - Status Check
cd /d "%~dp0"

echo ===================================================
echo   Sabil School - NFC Agent Status Check
echo ===================================================
echo.

powershell -NoProfile -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*bridge.js*' -or $_.CommandLine -like '*supervisor.js*' }; if ($procs) { Write-Host 'Status: RUNNING IN BACKGROUND (PID: ' ($procs.ProcessId -join ', ') ')' -ForegroundColor Green } else { Write-Host 'Status: STOPPED' -ForegroundColor Red }"

echo.
if exist agent.log (
    echo --- Last 15 lines of agent.log ---
    powershell -NoProfile -Command "Get-Content agent.log -Tail 15"
) else (
    echo (No agent.log file found yet)
)

echo.
pause
