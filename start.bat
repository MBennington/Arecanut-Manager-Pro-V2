@echo off
echo Starting Arecanut Manager Pro...
echo.

:: Start backend in new window
start "Backend Server" cmd /k "cd backend && node server.js"

:: Wait a moment for backend to initialize
timeout /t 2 /nobreak > nul

:: Start frontend
echo Starting frontend on http://localhost:3000
npx -y serve -l 3000
