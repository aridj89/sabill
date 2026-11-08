@echo off
REM Opens the local status page of the agent (http://127.0.0.1:47800/).
curl.exe -s -m 3 -o nul http://127.0.0.1:47800/status
if errorlevel 1 (
  echo L'agent NFC n'est pas en cours d'execution.
  echo Utilisez le raccourci "Redemarrer Sabil NFC Agent" du menu Demarrer.
  pause
) else (
  start "" http://127.0.0.1:47800/
)
