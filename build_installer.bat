@echo off
echo ========================================
echo   Omnis Salestrack - Build Installer
echo ========================================
echo.

echo [1/3] Cleaning previous builds...
if exist dist (
    rd /s /q dist
)

echo [2/3] Installing dependencies...
call npm install

echo [3/3] Packaging application...
call npm run build

echo.
echo ========================================
echo   Build Complete! 
echo   Check the 'dist' folder for .exe
echo ========================================
pause
