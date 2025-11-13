@echo off
REM Diagnostic script for AI Marketing Platform

echo ===== AI Marketing Platform - Diagnostic =====
echo.

echo [1] Checking Node.js...
node --version
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js not found!
  goto end
)
echo OK

echo.
echo [2] Checking npm...
npm --version
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: npm not found!
  goto end
)
echo OK

echo.
echo [3] Checking project directory...
cd /d "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Cannot access project directory!
  goto end
)
echo Current directory: %cd%
echo OK

echo.
echo [4] Checking if node_modules exists...
if exist node_modules (
  echo node_modules found
) else (
  echo WARNING: node_modules not found, running npm install...
  call npm install
)
echo OK

echo.
echo [5] Checking frontend files...
if exist "frontend\package.json" (
  echo frontend\package.json found
) else (
  echo ERROR: frontend\package.json not found!
  goto end
)

if exist "frontend\src\app\page.tsx" (
  echo frontend\src\app\page.tsx found
) else (
  echo ERROR: frontend\src\app\page.tsx not found!
  goto end
)

if exist "frontend\next.config.js" (
  echo frontend\next.config.js found
) else (
  echo ERROR: frontend\next.config.js not found!
  goto end
)
echo OK

echo.
echo [6] Checking backend files...
if exist "backend\package.json" (
  echo backend\package.json found
) else (
  echo ERROR: backend\package.json not found!
  goto end
)

if exist "backend\src\index.js" (
  echo backend\src\index.js found
) else (
  echo ERROR: backend\src\index.js not found!
  goto end
)
echo OK

echo.
echo [7] Testing ports...
echo Testing port 3000 (frontend)...
netstat -ano | findstr :3000 > nul
if %ERRORLEVEL% EQU 0 (
  echo WARNING: Port 3000 is already in use!
  netstat -ano | findstr :3000
) else (
  echo Port 3000 is free
)

echo.
echo Testing port 5000 (backend)...
netstat -ano | findstr :5000 > nul
if %ERRORLEVEL% EQU 0 (
  echo WARNING: Port 5000 is already in use!
  netstat -ano | findstr :5000
) else (
  echo Port 5000 is free
)
echo OK

echo.
echo ===== Diagnostic Complete =====
echo.
echo If all checks passed, you can now run:
echo   Terminal 1: npm run dev --workspace=backend
echo   Terminal 2: npm run dev --workspace=frontend
echo.

:end
pause
