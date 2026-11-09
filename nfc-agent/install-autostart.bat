@echo off
title Sabil NFC Agent - Auto-Start Setup
cd /d "%~dp0"

echo ===================================================
echo   Sabil School - NFC Agent Auto-Start Setup
echo ===================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 goto no_node

echo [1/3] Fermeture des anciennes fenetres et processus...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Sabil*" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*supervisor.js*' -or $_.CommandLine -like '*bridge.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo.
echo [2/3] Configuration du demarrage automatique avec Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir = (Get-Location).Path; $shortcut = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\Sabil-NFC-Bridge.lnk'; $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($shortcut); $s.TargetPath = 'wscript.exe'; $s.Arguments = '"' + (Join-Path $dir 'silent-launcher.vbs') + '"'; $s.WorkingDirectory = $dir; $s.Save(); Write-Host '[OK] Raccourci cree dans le dossier Demarrage Windows.'"

echo.
echo [3/3] Lancement de l agent en arriere-plan (mode invisible)...
wscript.exe "%~dp0silent-launcher.vbs"

echo.
echo ========================================================
echo   SUCCES TOTAL ! L agent NFC est installe et actif.
echo ========================================================
echo.
echo - Il tourne maintenant silencieusement en arriere-plan.
echo - Il redemarrera tout seul a chaque allumage du PC.
echo - Plus besoin d ouvrir de terminal ni de double-cliquer.
echo - Vous pouvez approcher une carte NFC maintenant pour tester.
echo.
goto finish

:no_node
echo.
echo [ERREUR] Node.js n est pas installe sur ce PC !
echo Veuillez installer Node.js depuis https://nodejs.org/
echo.
goto finish

:finish
echo Appuyez sur Entree pour fermer cette fenetre.
pause
