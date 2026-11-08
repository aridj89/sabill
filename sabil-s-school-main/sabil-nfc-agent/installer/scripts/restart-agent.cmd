@echo off
call "%~dp0stop-agent.cmd" /quiet
timeout /t 2 >nul
wscript.exe "%~dp0start-agent.vbs"
echo Sabil NFC Agent redemarre.
timeout /t 3 >nul
