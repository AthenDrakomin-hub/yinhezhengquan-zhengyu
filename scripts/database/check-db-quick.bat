@echo off
REM ============================================================
REM 银河证券管理系统 - 数据库对齐快速检查脚本
REM 使用方式：双击运行或在命令行执行 check-db-quick.bat
REM ============================================================

echo.
echo **************************************************************
echo *   Galaxy Securities - Database Quick Check                 *
echo **************************************************************
echo.
echo Checking for psql installation...
echo.

REM Check if psql is available
where psql >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] psql found!
    echo.
    goto execute_check
) else (
    echo [FAIL] psql not found in PATH
    echo.
    goto install_guide
)

:execute_check
echo Starting database alignment check...
echo.

REM Execute the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0generate-db-alignment-report.ps1" -Quick

echo.
echo **************************************************************
echo Check completed!
echo **************************************************************
echo.
echo To run a full check with report export, execute:
echo   .\scripts\generate-db-alignment-report.ps1 -ExportReport
echo.
pause
goto end

:install_guide
echo **************************************************************
echo INSTALLATION REQUIRED
echo **************************************************************
echo.
echo psql (PostgreSQL client) is not installed or not in PATH.
echo.
echo Please choose one of the following options:
echo.
echo Option 1: Install via Scoop (Recommended)
echo   1. Open PowerShell
echo   2. Run: scoop install postgresql
echo.
echo Option 2: Download from PostgreSQL website
echo   Visit: https://www.postgresql.org/download/windows/
echo.
echo Option 3: Use Supabase Dashboard SQL Editor
echo   Execute SQL queries manually in the browser
echo.
echo For detailed installation guide, see:
echo   scripts\PSQL_INSTALL_GUIDE.md
echo.
echo Press any key to open the installation guide...
pause >nul
start notepad "%~dp0PSQL_INSTALL_GUIDE.md"

:end
exit /b 0
