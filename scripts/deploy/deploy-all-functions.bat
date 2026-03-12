@echo off
REM Edge Functions 批量部署脚本 (Windows)
REM 使用方法: deploy-all-functions.bat

echo 🚀 开始部署所有 Edge Functions...
echo.

set PROJECT_REF=rfnrosyfeivcbkimjlwo
set SUCCESS=0
set FAILED=0

echo 📦 部署 admin-admin-operations...
supabase functions deploy admin-admin-operations --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ admin-admin-operations 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ admin-admin-operations 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 market-fetch-galaxy-news...
supabase functions deploy market-fetch-galaxy-news --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ market-fetch-galaxy-news 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ market-fetch-galaxy-news 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 market-fetch-stock-f10...
supabase functions deploy market-fetch-stock-f10 --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ market-fetch-stock-f10 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ market-fetch-stock-f10 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 market-get-market-data...
supabase functions deploy market-get-market-data --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ market-get-market-data 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ market-get-market-data 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 sync-nexus-sync...
supabase functions deploy sync-nexus-sync --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ sync-nexus-sync 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ sync-nexus-sync 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 trade-approve-trade-order...
supabase functions deploy trade-approve-trade-order --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ trade-approve-trade-order 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ trade-approve-trade-order 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 trade-cancel-trade-order...
supabase functions deploy trade-cancel-trade-order --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ trade-cancel-trade-order 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ trade-cancel-trade-order 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 trade-create-trade-order...
supabase functions deploy trade-create-trade-order --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ trade-create-trade-order 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ trade-create-trade-order 部署失败
    set /a FAILED+=1
)
echo.

echo 📦 部署 trade-match-trade-order...
supabase functions deploy trade-match-trade-order --project-ref %PROJECT_REF%
if %ERRORLEVEL% EQU 0 (
    echo ✅ trade-match-trade-order 部署成功
    set /a SUCCESS+=1
) else (
    echo ❌ trade-match-trade-order 部署失败
    set /a FAILED+=1
)
echo.

echo ==================================
echo 📊 部署统计:
echo    成功: %SUCCESS%
echo    失败: %FAILED%
echo ==================================

if %FAILED% EQU 0 (
    echo ✅ 所有函数部署成功!
) else (
    echo ⚠️ 部分函数部署失败，请检查错误信息
)

pause
