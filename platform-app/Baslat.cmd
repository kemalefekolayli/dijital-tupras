@echo off
cd /d "%~dp0"
echo Pusula baslatiliyor. Bu pencereyi acik birakin.
echo Tarayicida http://127.0.0.1:3000 adresini acin.
node server/index.js
pause
