@echo off
title Sabil NFC Agent - Stop
echo Stopping Sabil NFC Agent and supervisor...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Sabil*" >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*supervisor.js*' -or $_.CommandLine -like '*bridge.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo Sabil NFC Agent has been stopped.
pause
