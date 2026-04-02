@echo off
title UNREAL_PEOPLE_GLOBAL_LAUNCHER
color 0b

:: CHANGE THIS PATH if you move the folder again
set PROJECT_PATH=C:\Users\%USERNAME%\Desktop\Projects\unreal-people

echo //////////////////////////////////////////
echo // INITIALIZING UNREAL PEOPLE V99       //
echo // TARGET: %PROJECT_PATH%
echo //////////////////////////////////////////

:: Jump to the project directory
cd /d "%PROJECT_PATH%"

:: Check if the folder actually exists
if not exist "package.json" (
    echo [!] ERROR: Project not found at %PROJECT_PATH%
    echo Please check the path inside this .bat file.
    pause
    exit
)

echo // STARTING_DEV_SERVER...
start http://localhost:3000

:: Run the engine
npm run dev

pause