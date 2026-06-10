@echo off
echo ==========================================
echo   Technove Project Setup and Start Script
echo ==========================================
echo.
echo [1/3] Installing Node.js dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] npm install failed. Please check if Node.js is installed correctly.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo [2/3] Building the project to verify TypeScript compilation...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed. There are TypeScript compilation errors.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo [3/3] Starting the development servers (Frontend & Backend)...
call npm run dev
echo.
pause
