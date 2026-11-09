@echo off
title Sabil NFC Agent - Auto-Start Setup
cd /d "%~dp0"

echo ===================================================
echo   Sabil School - NFC Agent Auto-Start Installer
echo ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js (LTS version) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [1/3] Installing agent dependencies...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [1/3] Dependencies already installed.
)

echo [2/3] Configuring silent auto-start on Windows boot...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir = (Get-Location).Path; $shortcut = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\Sabil-NFC-Bridge.lnk'; $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($shortcut); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"' + (Join-Path $dir 'silent-launcher.vbs') + '\"'; $s.WorkingDirectory = $dir; $s.WindowStyle = 7; $s.Save()"

if errorlevel 1 (
    echo [ERROR] Could not create startup shortcut.
    pause
    exit /b 1
)

echo.
echo [3/3] Launching background NFC Agent right now...
wscript.exe "%~dp0silent-launcher.vbs"

echo.
echo ===================================================
echo   SUCCESS! Sabil NFC Agent is now installed.
echo ===================================================
echo - It is now running silently in the background.
echo - It will automatically launch whenever Windows starts.
echo - It runs without opening any black terminal windows.
echo - Logs are saved to: %~dp0agent.log
echo.
echo You can close this window now.
pause
