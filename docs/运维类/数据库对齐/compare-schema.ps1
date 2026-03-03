# ============================================================
# 银河证券管理系统 - 表结构对比脚本
# 功能：对比本地迁移文件与远程数据库的表结构
# 使用方式：.\scripts\compare-schema.ps1
# ============================================================

param(
    [switch]$ExportRemote,  # 导出远程架构到文件
    [switch]$Detailed      # 显示详细信息
)

Write-Host "📊 开始表结构对比..." -ForegroundColor Cyan
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

# 定义核心表清单（来自迁移文件）
$coreTables = @(
    "profiles",
    "holdings",
    "transactions",
    "conditional_orders",
    "asset_snapshots",
    "trades",
    "trade_executions",
    "positions",
    "ipos",
    "block_trade_products",
    "limit_up_stocks",
    "fund_flows",
    "admin_operation_logs",
    "trade_rules",
    "trade_rules_history",
    "migrations",
    "chat_messages",
    "tickets",
    "education_topics",
    "calendar_events",
    "banners",
    "reports",
    "user_recommendations",
    "batch_trade_orders",
    "market_data_cache",
    "performance_metrics",
    "user_behavior_logs"
)

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 1】获取远程数据库所有表" -ForegroundColor Cyan
Write-Host ""

# 获取远程所有表
$remoteTablesResult = psql "$dbConnection" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" -t
$remoteTables = ($remoteTablesResult | Where-Object { $_.Trim() -ne "" }) | ForEach-Object { $_.Trim() }

Write-Host "找到 $($remoteTables.Count) 个数据表:" -ForegroundColor Yellow
$remoteTables | ForEach-Object { Write-Host "  • $_" }

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 2】检查核心表是否存在" -ForegroundColor Cyan
Write-Host ""

$existingTables = @()
$missingTables = @()

foreach ($table in $coreTables) {
    if ($remoteTables -contains $table) {
        Write-Host "✅ $table - 存在" -ForegroundColor Green
        $existingTables += $table
    } else {
        Write-Host "❌ $table - 缺失" -ForegroundColor Red
        $missingTables += $table
    }
}

Write-Host ""
Write-Host "统计:" -ForegroundColor Yellow
Write-Host "  核心表总数：$($coreTables.Count)" -ForegroundColor White
Write-Host "  已存在：$($existingTables.Count)" -ForegroundColor Green
Write-Host "  缺失：$($missingTables.Count)" -ForegroundColor Red

if ($missingTables.Count -gt 0) {
    Write-Host ""
    Write-Host "缺失的表:" -ForegroundColor Red
    $missingTables | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
    Write-Host "提示：需要执行对应的迁移文件来创建这些表" -ForegroundColor Yellow
}

Write-Host ""

# 如果指定了 -ExportRemote 参数，导出远程架构
if ($ExportRemote) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "【步骤 3】导出远程数据库架构" -ForegroundColor Cyan
    Write-Host ""
    
    $outputFile = Join-Path $PSScriptRoot "..\database\remote_schema_export.sql"
    
    Write-Host "正在导出架构到：$outputFile" -ForegroundColor Yellow
    
    # 使用 psql 导出架构
    $null = psql "$dbConnection" -c "\d+" > $outputFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 架构导出成功！" -ForegroundColor Green
        Write-Host "文件位置：$outputFile" -ForegroundColor Gray
    } else {
        Write-Host "❌ 架构导出失败" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 4】详细表结构检查" -ForegroundColor Cyan
Write-Host ""

if ($Detailed) {
    foreach ($table in $existingTables) {
        Write-Host "`n📦 表：$table" -ForegroundColor Yellow
        Write-Host ("─" * 80) -ForegroundColor Gray
        
        # 获取列信息
        $columnsResult = psql "$dbConnection" -c "SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '$table'
        ORDER BY ordinal_position;" -t
        
        Write-Host "列结构:" -ForegroundColor Cyan
        $columnsResult | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
            Write-Host "  $_" -ForegroundColor White
        }
        
        # 获取索引信息
        $indexesResult = psql "$dbConnection" -c "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = '$table';" -t
        
        if ($indexesResult -and $indexesResult.Trim() -ne "") {
            Write-Host "索引:" -ForegroundColor Cyan
            $indexesResult | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                Write-Host "  $_" -ForegroundColor White
            }
        }
        
        Write-Host ""
    }
} else {
    Write-Host "提示：使用 -Detailed 参数查看详细的表结构信息" -ForegroundColor Yellow
    Write-Host ""
    
    # 显示关键表的简要信息
    Write-Host "关键表字段数统计:" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($table in $existingTables) {
        $countResult = psql "$dbConnection" -c "SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';" -t
        $columnCount = ($countResult | Where-Object { $_.Trim() -ne "" }).Trim()
        
        if ($columnCount) {
            Write-Host "  $table`: $columnCount 个字段" -ForegroundColor White
        }
    }
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 5】外键约束检查" -ForegroundColor Cyan
Write-Host ""

$fkResult = psql "$dbConnection" -c "SELECT 
    tc.table_name AS table_name,
    kcu.column_name AS column_name,
    ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;" -t

if ($fkResult -and $fkResult.Trim() -ne "") {
    Write-Host "外键约束:" -ForegroundColor Yellow
    $fkResult | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
} else {
    Write-Host "未找到外键约束" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ 表结构对比完成！" -ForegroundColor Green
Write-Host ""
