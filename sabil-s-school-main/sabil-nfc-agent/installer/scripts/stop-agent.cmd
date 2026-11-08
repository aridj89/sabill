@echo off
REM Stops the Sabil NFC Agent (supervisor + agent process tree).
set "DATA=%LOCALAPPDATA%\SabilNfcAgent"
set "FOUND=0"
if exist "%DATA%\supervisor.pid" (
  for /f "usebackq delims=" %%p in ("%DATA%\supervisor.pid") do (
    taskkill /PID %%p /T /F >nul 2>&1 && set "FOUND=1"
  )
  del "%DATA%\supervisor.pid" >nul 2>&1
)
if exist "%DATA%\agent.pid" (
  for /f "usebackq delims=" %%p in ("%DATA%\agent.pid") do (
    taskkill /PID %%p /T /F >nul 2>&1 && set "FOUND=1"
  )
  del "%DATA%\agent.pid" >nul 2>&1
)
if "%FOUND%"=="1" (
  echo Sabil NFC Agent arrete.
) else (
  echo Sabil NFC Agent n'etait pas en cours d'execution.
)
if /i not "%~1"=="/quiet" timeout /t 3 >nul
