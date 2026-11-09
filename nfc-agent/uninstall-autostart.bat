@echo off
title Sabil NFC Agent - Uninstall Auto-Start
echo Removing Sabil NFC Agent from Windows startup...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Sabil-NFC-Bridge.lnk"

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo Startup shortcut removed.
)

call "%~dp0stop-agent.bat"
echo Auto-start has been disabled.
pause
