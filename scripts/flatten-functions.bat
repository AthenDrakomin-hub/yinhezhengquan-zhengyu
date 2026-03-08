mkdir supabase\functions-flat
xcopy supabase\functions\admin\admin-operations supabase\functions-flat\admin-operations\ /E /I
xcopy supabase\functions\market\fetch-galaxy-news supabase\functions-flat\fetch-galaxy-news\ /E /I
xcopy supabase\functions\market\fetch-stock-f10 supabase\functions-flat\fetch-stock-f10\ /E /I
xcopy supabase\functions\market\get-market-data supabase\functions-flat\get-market-data\ /E /I
xcopy supabase\functions\sync\nexus-sync supabase\functions-flat\nexus-sync\ /E /I
xcopy supabase\functions\trade\approve-trade-order supabase\functions-flat\approve-trade-order\ /E /I
xcopy supabase\functions\trade\cancel-trade-order supabase\functions-flat\cancel-trade-order\ /E /I
xcopy supabase\functions\trade\create-trade-order supabase\functions-flat\create-trade-order\ /E /I
xcopy supabase\functions\trade\match-trade-order supabase\functions-flat\match-trade-order\ /E /I

rmdir supabase\functions /S /Q
rename supabase\functions-flat functions
