@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
cd /d "%ROOT%" || exit /b 1
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo powershell.exe not found.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-dev.ps1" %*
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo Failed to start blog services. Exit code: %EXITCODE%
  echo Tip: run "pnpm dev:check" or close processes using ports 8000, 3000, 5173.
  pause
)
exit /b %EXITCODE%
