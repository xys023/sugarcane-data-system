@echo off
chcp 65001 >nul
title Sugarcane Data System

echo ========================================
echo   Sugarcane Data System - Starting
echo ========================================
echo.

cd /d "%~dp0"
cd ..\server

if errorlevel 1 (
    echo [ERROR] Cannot find server folder.
    echo Make sure this file is in the "deploy" folder.
    pause
    exit /b 1
)

echo Work dir: %CD%
echo.

if not exist "node_modules" (
    echo [WARNING] Dependencies not installed.
    echo Please run "install.bat" first.
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org (need v22+)
    pause
    exit /b 1
)

echo Node.js:
node --version
echo.
echo ========================================
echo   Starting service...
echo   Browser: http://localhost:3000
echo   Account: admin / admin123
echo   Close window to stop service
echo ========================================
echo.

node server.js

echo.
echo Service stopped.
pause
