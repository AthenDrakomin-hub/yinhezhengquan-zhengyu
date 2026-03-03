# ============================================================
# 银河证券管理系统 - 扩展和配置检查脚本
# 功能：检查数据库扩展、函数、触发器等配置
# 使用方式：.\scripts\check-extensions-config.ps1
# ============================================================

param(
    [switch]$Detailed,     # 显示详细信息
    [switch]$ListFunctions # 列出所有自定义函数
)

Write-Host "⚙️  开始扩展和配置检查..." -ForegroundColor Cyan
Write-Host ""

# 从 .env 文件读取数据库连接字符串
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $dbUrlNonPooling = ($envContent | Where-Object { $_ -match "^DATABASE_URL_NON_POOLING=" }) -replace "^DATABASE_URL_NON_POOLING=", ""
    
    if ([string]::IsNullOrWhiteSpace($dbUrlNonPooling)) {
        Write-Host "❌ 错误：未找到 DATABASE_URL_NON_POOLING 配置" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 错误：未找到 .env 文件" -ForegroundColor Red
    exit 1
}

# Handle SSL mode - use disable for psql 18.x
if ($dbUrlNonPooling -like "*sslmode=require*") {
    $dbConnection = $dbUrlNonPooling.Replace('sslmode=require', 'sslmode=disable')
} else {
    $dbConnection = $dbUrlNonPooling
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 1】检查已安装的数据库扩展" -ForegroundColor Cyan
Write-Host ""

$extensionsQuery = @"
SELECT 
    extname AS extension_name,
    extversion AS version,
    nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;
"@

$extensions = psql "$dbConnection" -c $extensionsQuery

Write-Host $extensions

Write-Host ""

Write-Host "📋 Supabase 常用扩展检查:" -ForegroundColor Yellow
Write-Host ("─" * 80) -ForegroundColor Gray

$requiredExtensions = @(
    "uuid-ossp",
    "pgcrypto",
    "pgjwt",
    "supabase_crypto",
    "pgsodium",
    "vault"
)

foreach ($ext in $requiredExtensions) {
    $extExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = '$ext');" -t
    
    if ($extExists.Trim() -eq "t") {
        Write-Host "✅ $ext - 已安装" -ForegroundColor Green
    } else {
        Write-Host "❌ $ext - 未安装" -ForegroundColor Red
    }
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 2】检查数据库函数" -ForegroundColor Cyan
Write-Host ""

if ($ListFunctions) {
    $functionsQuery = @"
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    CASE p.prokind
        WHEN 'f' THEN 'FUNCTION'
        WHEN 'p' THEN 'PROCEDURE'
        WHEN 'a' THEN 'AGGREGATE'
        WHEN 'w' THEN 'WINDOW'
    END AS function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY function_name;
"@
    
    $functions = psql "$dbConnection" -c $functionsQuery
    
    Write-Host "公共模式下的所有函数:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $functions
    Write-Host ""
} else {
    # 只统计函数数量
    $functionCountQuery = @"
SELECT COUNT(*) AS function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
"@
    
    $functionCount = psql "$dbConnection" -c $functionCountQuery
    Write-Host $functionCount
    Write-Host ""
    Write-Host "提示：使用 -ListFunctions 参数查看所有函数列表" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 3】检查迁移优化系统函数" -ForegroundColor Cyan
Write-Host ""

$migrationFunctions = @(
    "table_exists",
    "column_exists",
    "index_exists",
    "policy_exists",
    "migration_applied",
    "create_table_safe"
)

foreach ($func in $migrationFunctions) {
    $funcExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '$func');" -t
    
    if ($funcExists.Trim() -eq "t") {
        Write-Host "✅ $func - 存在" -ForegroundColor Green
    } else {
        Write-Host "❌ $func - 不存在" -ForegroundColor Red
    }
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 4】检查触发器" -ForegroundColor Cyan
Write-Host ""

$triggersQuery = @"
SELECT 
    trigger_name,
    event_manipulation AS event,
    event_object_table AS table_name,
    action_statement AS action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
"@

$triggers = psql "$dbConnection" -c $triggersQuery

Write-Host $triggers

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 5】检查视图" -ForegroundColor Cyan
Write-Host ""

$viewsQuery = @"
SELECT 
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
"@

$views = psql "$dbConnection" -c $viewsQuery

if ($views -and $views.Trim() -ne "") {
    Write-Host $views
} else {
    Write-Host "未发现自定义视图" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 6】检查序列" -ForegroundColor Cyan
Write-Host ""

$sequencesQuery = @"
SELECT 
    sequencename,
    seqstart AS start_value,
    seqmin AS min_value,
    seqmax AS max_value,
    seqincrement AS increment
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;
"@

$sequences = psql "$dbConnection" -c $sequencesQuery

Write-Host $sequences

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 7】检查数据库配置参数" -ForegroundColor Cyan
Write-Host ""

$configQuery = @"
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name IN (
    'max_connections',
    'shared_buffers',
    'work_mem',
    'maintenance_work_mem',
    'effective_cache_size',
    'statement_timeout',
    'idle_in_transaction_session_timeout'
)
ORDER BY name;
"@

$config = psql "$dbConnection" -c $configQuery

Write-Host $config

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 8】检查表空间和存储" -ForegroundColor Cyan
Write-Host ""

$tablespaceQuery = @"
SELECT 
    spcname AS tablespace_name,
    pg_tablespace_location(oid) AS location
FROM pg_tablespace
WHERE spcname NOT IN ('pg_default', 'pg_global');
"@

$tablespaces = psql "$dbConnection" -c $tablespaceQuery

if ($tablespaces -and $tablespaces.Trim() -ne "") {
    Write-Host $tablespaces
} else {
    Write-Host "使用默认表空间" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 9】数据库大小统计" -ForegroundColor Cyan
Write-Host ""

$dbSizeQuery = @"
SELECT 
    pg_database.datname AS database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();
"@

$dbSize = psql "$dbConnection" -c $dbSizeQuery

Write-Host $dbSize

Write-Host ""

# 总表空间大小
$totalSpaceQuery = @"
SELECT 
    pg_size_pretty(SUM(pg_total_relation_size(relid))) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public';
"@

$totalSpace = psql "$dbConnection" -c $totalSpaceQuery

Write-Host "所有用户表总大小:" -ForegroundColor Yellow
Write-Host $totalSpace

Write-Host ""

if ($Detailed) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "【详细】扩展模块详细信息" -ForegroundColor Cyan
    Write-Host ""
    
    $extDetailsQuery = @"
SELECT 
    e.extname AS extension_name,
    e.extversion AS version,
    n.nspname AS schema_name,
    d.description
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
LEFT JOIN pg_description d ON d.objoid = e.oid AND d.classoid = 'pg_extension'::regclass
ORDER BY e.extname;
"@
    
    $extDetails = psql "$dbConnection" -c $extDetailsQuery
    Write-Host $extDetails
    Write-Host ""
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ 扩展和配置检查完成！" -ForegroundColor Green
Write-Host ""
Write-Host "提示：" -ForegroundColor Yellow
Write-Host "- 使用 -Detailed 参数查看扩展的详细信息" -ForegroundColor White
Write-Host "- 使用 -ListFunctions 参数查看所有自定义函数" -ForegroundColor White
Write-Host ""
