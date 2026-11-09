@echo off
title Sabil School - Local NFC Bridge Agent
cd /d "%~dp0"

echo ===================================================
echo   Sabil School - Local NFC USB Bridge Agent
echo ===================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 goto no_node

if not exist node_modules goto install_deps

:run_agent
echo [OK] Node.js detecte.
echo [OK] Lancement du bridge NFC vers Railway...
echo.
node agent.js
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] L agent s est arrete avec une erreur.
)
goto finish

:no_node
echo ========================================================
echo  [ERREUR CRITIQUE] Node.js n est pas installe !
echo ========================================================
echo.
echo Ce PC n a pas encore Node.js.
echo Pour que le lecteur NFC fonctionne, installez Node.js :
echo.
echo 1. Allez sur : https://nodejs.org/
echo 2. Telechargez la version "LTS" (recommandee)
echo 3. Installez-le (suivant, suivant, terminer)
echo 4. Relancez ensuite ce fichier start.bat.
echo.
goto finish

:install_deps
echo [1/2] Installation des dependances (premiere execution)...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo [ERREUR] L installation npm a echoue. Verifiez votre connexion internet.
    goto finish
)
goto run_agent

:finish
echo.
echo ========================================================
echo La fenetre restera ouverte. Appuyez sur Entree pour quitter.
pause
