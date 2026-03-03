@echo off
echo ========================================
echo 清理所有已部署的 Edge Functions
echo ========================================
echo.

set PROJECT_REF=rfnrosyfeivcbkimjlwo

echo 正在删除已发现的函数...
echo.

echo 删除 admin-operations...
supabase functions delete admin-operations --project-ref %PROJECT_REF%
echo.

echo 删除 nexus-sync...
supabase functions delete nexus-sync --project-ref %PROJECT_REF%
echo.

echo 删除 match-trade-order...
supabase functions delete match-trade-order --project-ref %PROJECT_REF%
echo.

echo ========================================
echo 如果还有其他函数，请手动删除：
echo supabase functions delete [函数名] --project-ref %PROJECT_REF%
echo ========================================
echo.

pause
