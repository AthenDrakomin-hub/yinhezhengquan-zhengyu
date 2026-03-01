@echo off
REM 部署所有 Edge Functions
REM 运行: deploy-functions.bat

echo ========================================
echo 部署 Edge Functions 到 Supabase
echo ========================================
echo.

REM 从环境变量获取项目 ID
for /f "tokens=2 delims=/." %%a in ('findstr "VITE_SUPABASE_URL" .env.local') do set PROJECT_REF=%%a

if "%PROJECT_REF%"=="" (
    echo ❌ 无法获取项目 ID
    exit /b 1
)

echo 📦 项目 ID: %PROJECT_REF%
echo.

REM 部署所有函数
for /d %%f in (supabase\functions\*) do (
    echo 📤 部署 %%~nxf...
    call npx supabase functions deploy %%~nxf --project-ref %PROJECT_REF%
    if errorlevel 1 (
        echo ❌ %%~nxf 部署失败
    ) else (
        echo ✅ %%~nxf 部署成功
    )
    echo.
)

echo 🎉 所有函数部署完成！
pause
