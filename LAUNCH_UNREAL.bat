@echo off
title UNREAL_PEOPLE_IGNITION
echo // INITIATING DUAL-CORE BOOT SEQUENCE...

:: 1. Launch the Backend Engine
echo // STARTING HARDWARE BRIDGE (PORT 8008)...
start "UP_BACKEND_ENGINE" cmd /k "cd /d "%~dp0backend" && if exist .\venv\Scripts\activate.bat (call .\venv\Scripts\activate.bat) && python main.py"

:: 2. Launch the Frontend Interface
echo // STARTING CINEMATIC INTERFACE (PORT 3000)...
start "UP_FRONTEND_INTERFACE" cmd /k "cd /d "%~dp0" && npm run dev"

:: 3. Handshake Delay & Browser Auto-Launch
echo // WAITING FOR NEURAL LINK STABILIZATION...
timeout /t 5 /nobreak > nul
echo // OPENING INTERFACE...
start http://localhost:3000

echo // BOOT COMPLETE. ALL SYSTEMS OPERATIONAL.
