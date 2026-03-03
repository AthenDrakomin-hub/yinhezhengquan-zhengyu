@echo off
echo ========================================
echo 清理所有 17 个 Edge Functions
echo ========================================
echo.

set PROJECT_REF=rfnrosyfeivcbkimjlwo

echo 开始删除所有函数...
echo.

supabase functions delete admin-operations --project-ref %PROJECT_REF%
supabase functions delete cancel-trade --project-ref %PROJECT_REF%
supabase functions delete create-trade --project-ref %PROJECT_REF%
supabase functions delete f10-mock --project-ref %PROJECT_REF%
supabase functions delete galaxy-news --project-ref %PROJECT_REF%
supabase functions delete galaxy-news-feed --project-ref %PROJECT_REF%
supabase functions delete ipo-subscribe --project-ref %PROJECT_REF%
supabase functions delete limit-up-submit --project-ref %PROJECT_REF%
supabase functions delete match-trade-order --project-ref %PROJECT_REF%
supabase functions delete mock-quotes --project-ref %PROJECT_REF%
supabase functions delete nexus-sync --project-ref %PROJECT_REF%
supabase functions delete order-validator --project-ref %PROJECT_REF%
supabase functions delete quotes-mock --project-ref %PROJECT_REF%
supabase functions delete trade-audit --project-ref %PROJECT_REF%
supabase functions delete trade-cancel --project-ref %PROJECT_REF%
supabase functions delete trade-matcher --project-ref %PROJECT_REF%
supabase functions delete trade-matcher-v2 --project-ref %PROJECT_REF%

echo.
echo ========================================
echo ✅ 所有函数已删除！
echo ========================================
echo.
echo 现在可以重新部署正确的函数了
echo.
pause
