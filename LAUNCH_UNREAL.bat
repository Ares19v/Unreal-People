@echo off
title UNREAL_PEOPLE_IGNITION
echo // INITIATING DUAL-CORE BOOT SEQUENCE...

:: 1. Launch the Backend Engine
echo // STARTING HARDWARE BRIDGE (PORT 8000)...
start "UP_BACKEND_ENGINE" cmd /k "cd /d C:\Users\Devansh Tyagi\Desktop\Projects\unreal-people\backend && .\venv\Scripts\activate && python main.py"

:: 2. Launch the Frontend Interface
echo // STARTING CINEMATIC INTERFACE (PORT 3000)...
start "UP_FRONTEND_INTERFACE" cmd /k "cd /d C:\Users\Devansh Tyagi\Desktop\Projects\unreal-people && npm run dev"

:: 3. Handshake Delay & Browser Auto-Launch
echo // WAITING FOR NEURAL LINK STABILIZATION...
timeout /t 6 /nobreak > nul
echo // OPENING INTERFACE...
start http://localhost:3000

echo // BOOT COMPLETE. ALL SYSTEMS OPERATIONAL.
