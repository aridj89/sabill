@echo off
title Sabil School - Local NFC Bridge Agent
cd /d "%~dp0"

echo ===================================================
echo   Sabil School - Local NFC USB Bridge Agent
echo ===================================================
echo.

if not exist node_modules (
    echo [1/2] Installing local bridge dependencies...
    npm install
    echo.
)

echo [2/2] Starting NFC Bridge Agent...
node bridge.js
pause
