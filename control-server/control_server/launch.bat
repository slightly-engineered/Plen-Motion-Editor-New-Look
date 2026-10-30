@echo off
cd /d "%~dp0"
echo Starting PLEN Control Server (Python 3)...

rem Use the private .venv made by setup.ps1 if it exists, otherwise the system Python.
set "PY=python"
if exist "%~dp0.venv\Scripts\python.exe" set "PY=%~dp0.venv\Scripts\python.exe"

start "PLEN Control Server" "%PY%" "%~dp0main.py"

echo Waiting for the server to start...
timeout /t 2 >nul

echo Opening http://localhost:17264/ in your default browser...
start "" "http://localhost:17264/"

pause