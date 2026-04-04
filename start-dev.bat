@echo off
echo Starting Arovy Development Environment...
echo.

echo [1/3] Starting Backend (arovy-backend)...
start "Arovy Backend" cmd /k "cd /d %~dp0arovy-backend && npm run dev"

echo [2/3] Starting Admin Panel (arovy-admin)...
start "Arovy Admin" cmd /k "cd /d %~dp0arovy-admin && npm run dev"

echo [3/3] Starting Disruption Panel (arovy-disruption-panel)...
start "Arovy Disruption Panel" cmd /k "cd /d %~dp0arovy-disruption-panel && npm run dev"

echo.
echo All services started! Check the opened terminals for logs.
echo.
pause
