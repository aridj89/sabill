@echo off
title Sabil School — Windows NFC Reader Agent
cd /d "%~dp0"

echo ===================================================
echo   Sabil School - Windows USB NFC Agent
echo ===================================================
echo.

if not exist node_modules (
    echo [1/2] Installing required agent dependencies...
    call npm install
    echo.
)

echo [2/2] Launching NFC Agent...
node agent.js
pause
