@echo off
chcp 65001 >nul
title Sugarcane Data System - Install

echo ========================================
echo   Sugarcane Data System - Install Deps
echo ========================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 22+ from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

cd /d "%~dp0"
cd ..\server

echo Work dir: %CD%
echo.
echo Installing dependencies (may take a few minutes)...
echo.

call npm install --registry=https://registry.npmmirror.com

if errorlevel 1 (
    echo.
    echo [ERROR] Install failed. Check network connection.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Dependencies installed successfully!
echo ========================================
echo.
echo Next: run "start.bat" to launch the system.
echo.
pause
