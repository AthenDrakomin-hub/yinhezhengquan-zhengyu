@echo off
echo ========================================
echo 清理并重新部署 Edge Functions
echo ========================================
echo.

set PROJECT_REF=rfnrosyfeivcbkimjlwo

echo 步骤 1: 删除旧函数
echo ----------------------------------------
echo 删除 match-trade-order...
supabase functions delete match-trade-order --project-ref %PROJECT_REF%
echo.

echo 删除 admin-operations...
supabase functions delete admin-operations --project-ref %PROJECT_REF%
echo.

echo 步骤 2: 部署新函数（正确命名）
echo ----------------------------------------

echo 📦 部署交易相关函数...
supabase functions deploy create-trade-order --project-ref %PROJECT_REF%
supabase functions deploy cancel-trade-order --project-ref %PROJECT_REF%
supabase functions deploy approve-trade-order --project-ref %PROJECT_REF%
supabase functions deploy match-trade-order --project-ref %PROJECT_REF%
echo.

echo 📦 部署市场数据函数...
supabase functions deploy get-market-data --project-ref %PROJECT_REF%
supabase functions deploy fetch-stock-f10 --project-ref %PROJECT_REF%
supabase functions deploy fetch-galaxy-news --project-ref %PROJECT_REF%
echo.

echo 📦 部署管理和同步函数...
supabase functions deploy admin-operations --project-ref %PROJECT_REF%
supabase functions deploy nexus-sync --project-ref %PROJECT_REF%
echo.

echo ========================================
echo ✅ 部署完成！
echo ========================================
pause
