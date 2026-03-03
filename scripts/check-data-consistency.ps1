# ============================================================
# 银河证券管理系统 - 数据一致性检查脚本
# 功能：检查远程数据库的数据量和关键数据
# 使用方式：.\scripts\check-data-consistency.ps1
# ============================================================

param(
    [switch]$ExportCSV,    # 导出数据到 CSV
    [switch]$CheckAll      # 检查所有表（默认只检查核心表）
)

Write-Host "📊 开始数据一致性检查..." -ForegroundColor Cyan
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

# 定义需要检查的表
$coreTables = @(
    "profiles",
    "holdings",
    "transactions",
    "trades",
    "conditional_orders",
    "asset_snapshots",
    "ipos",
    "block_trade_products",
    "limit_up_stocks",
    "fund_flows",
    "admin_operation_logs",
    "chat_messages",
    "tickets"
)

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 1】统计所有表的数据量" -ForegroundColor Cyan
Write-Host ""

# 获取所有表的行数统计
$tableStatsQuery = @"
SELECT 
    relname AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
"@

$statsResult = psql "$dbConnection" -c $tableStatsQuery

Write-Host $statsResult

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 2】核心表数据统计" -ForegroundColor Cyan
Write-Host ""

foreach ($table in $coreTables) {
    # 检查表是否存在
    $tableExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" -t
    
    if ($tableExists.Trim() -eq "t") {
        $countResult = psql "$dbConnection" -c "SELECT COUNT(*) FROM $table;" -t
        $count = $countResult.Trim()
        
        Write-Host "✅ $table`: $count 条记录" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $table`: 表不存在" -ForegroundColor Yellow
    }
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 3】关键数据检查" -ForegroundColor Cyan
Write-Host ""

# 3.1 检查管理员账户
Write-Host "`n👥 管理员账户:" -ForegroundColor Yellow
Write-Host ("─" * 80) -ForegroundColor Gray

$adminCheck = psql "$dbConnection" -c "SELECT 
    id,
    email,
    username,
    role,
    status,
    created_at
FROM profiles
WHERE role LIKE '%admin%' OR email LIKE '%admin%'
ORDER BY created_at DESC
LIMIT 5;"

Write-Host $adminCheck

Write-Host ""

# 3.2 检查最新交易记录
Write-Host "💹 最新交易记录:" -ForegroundColor Yellow
Write-Host ("─" * 80) -ForegroundColor Gray

# 检查 trades 表是否存在
$tradesExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trades');" -t

if ($tradesExists.Trim() -eq "t") {
    $recentTrades = psql "$dbConnection" -c "SELECT 
        id,
        user_id,
        symbol,
        type,
        price,
        quantity,
        status,
        created_at
    FROM trades
    ORDER BY created_at DESC
    LIMIT 5;"
    
    Write-Host $recentTrades
} else {
    Write-Host "⚠️  trades 表不存在" -ForegroundColor Yellow
}

Write-Host ""

# 3.3 检查用户资产分布
Write-Host "💰 用户资产统计:" -ForegroundColor Yellow
Write-Host ("─" * 80) -ForegroundColor Gray

$assetsCheck = psql "$dbConnection" -c "SELECT 
    COUNT(*) AS total_users,
    AVG(balance) AS avg_balance,
    MAX(balance) AS max_balance,
    MIN(balance) AS min_balance
FROM profiles;"

Write-Host $assetsCheck

Write-Host ""

# 3.4 检查 IPO 数据
Write-Host "📈 IPO 数据统计:" -ForegroundColor Yellow
Write-Host ("─" * 80) -ForegroundColor Gray

$ipoExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ipos');" -t

if ($ipoExists.Trim() -eq "t") {
    $ipoStats = psql "$dbConnection" -c "SELECT 
        COUNT(*) AS total_ipos,
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_ipos,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closed_ipos
    FROM ipos;"
    
    Write-Host $ipoStats
} else {
    Write-Host "⚠️  ipos 表不存在" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 4】数据完整性检查" -ForegroundColor Cyan
Write-Host ""

# 4.1 检查孤儿记录
Write-Host "`n🔍 检查孤儿记录（无主用户的持仓）:" -ForegroundColor Yellow

$orphanCheck = psql "$dbConnection" -c "SELECT COUNT(*) AS orphan_holdings
FROM holdings h
LEFT JOIN profiles p ON h.user_id = p.id
WHERE p.id IS NULL;"

Write-Host $orphanCheck

Write-Host ""

# 4.2 检查重复记录
Write-Host "🔍 检查重复用户（相同邮箱）:" -ForegroundColor Yellow

$duplicateCheck = psql "$dbConnection" -c "SELECT 
    email,
    COUNT(*) as count
FROM profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;"

if ($duplicateCheck -and $duplicateCheck.Trim() -ne "") {
    Write-Host "发现重复邮箱:" -ForegroundColor Red
    Write-Host $duplicateCheck
} else {
    Write-Host "✅ 未发现重复邮箱" -ForegroundColor Green
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 5】数据导出（可选）" -ForegroundColor Cyan
Write-Host ""

if ($ExportCSV) {
    $outputDir = Join-Path $PSScriptRoot "..\database\exports"
    
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir | Out-Null
        Write-Host "创建导出目录：$outputDir" -ForegroundColor Yellow
    }
    
    Write-Host "正在导出数据..." -ForegroundColor Yellow
    
    foreach ($table in $coreTables) {
        $tableExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" -t
        
        if ($tableExists.Trim() -eq "t") {
            $outputFile = Join-Path $outputDir "$table.csv"
            Write-Host "  导出 $table ..." -ForegroundColor White
            
            $null = psql "$dbConnection" -c "\copy (SELECT * FROM $table) TO '$outputFile' WITH CSV HEADER"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✅ 导出成功：$outputFile" -ForegroundColor Green
            } else {
                Write-Host "    ❌ 导出失败" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
    Write-Host "✅ 数据导出完成！" -ForegroundColor Green
} else {
    Write-Host "提示：使用 -ExportCSV 参数导出数据到 CSV 文件" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ 数据一致性检查完成！" -ForegroundColor Green
Write-Host ""
