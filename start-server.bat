@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Запуск GameOfBrothers сервера...
start "" http://localhost:3000
node server\server.js
pause
