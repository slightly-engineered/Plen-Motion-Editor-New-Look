@echo off
title Anim8 Local Server

REM Force working directory to the folder where THIS .bat file lives
cd /d "%~dp0"

echo Serving Anim8 from:
echo %cd%
echo.

echo Starting Anim8 on http://localhost:8000 ...
start "" http://localhost:8000

python -m http.server 8000

pause