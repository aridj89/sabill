@echo off
title Sabil NFC Agent - Stop
echo Arret de l agent NFC et du superviseur...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Sabil*" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*supervisor.js*' -or $_.CommandLine -like '*bridge.js*' -or $_.CommandLine -like '*agent.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo [OK] L agent Sabil NFC a ete arrete.
pause
