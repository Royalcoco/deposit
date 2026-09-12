@echo off
title CONSOL // Local Naviguant & GameLift Hub
cd /d "%~dp0"

echo ===========================================================
echo       LANCEMENT DE LA CONSOLE LOCALE & PONT GAMELIFT
echo ===========================================================

if not exist "node_modules" (
    echo [INFO] Premier lancement detecte. Installation des dependances npm...
    call npm install
)

echo [INFO] Demarrage du serveur Hub Local sur http://localhost:3000 ...
start http://localhost:3000
node backend/server.js
pause
