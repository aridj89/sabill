@echo off
title Sabil School - Local NFC Bridge Agent
cd /d "%~dp0"

echo ===================================================
echo   Sabil School - Windows USB NFC Agent
echo ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS version) from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [1/2] Installing local bridge dependencies...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed!
        pause
        exit /b 1
    )
    echo.
)

echo [2/2] Starting NFC Bridge Agent...
node agent.js
if errorlevel 1 (
    echo.
    echo [ERROR] Agent terminated with an error.
)
pause
