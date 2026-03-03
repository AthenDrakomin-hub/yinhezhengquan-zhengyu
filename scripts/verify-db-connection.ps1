# ============================================================
# 银河证券管理系统 - 数据库连接验证脚本
# 功能：验证与远程Supabase数据库的连接
# 使用方式：.\scripts\verify-db-connection.ps1
# ============================================================

Write-Host "🔍 开始验证数据库连接..." -ForegroundColor Cyan
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
    Write-Host "❌ 错误：未找到 .env 文件，请位于项目根目录运行此脚本" -ForegroundColor Red
    exit 1
}

# Handle SSL mode - use disable for psql 18.x
if ($dbUrlNonPooling -like "*sslmode=require*") {
    $dbConnection = $dbUrlNonPooling.Replace('sslmode=require', 'sslmode=disable')
} else {
    $dbConnection = $dbUrlNonPooling
}

Write-Host "📡 连接信息:" -ForegroundColor Yellow
Write-Host "   项目 Ref: rfnrosyfeivcbkimjlwo"
Write-Host "   主机：aws-1-eu-central-1.pooler.supabase.com"
Write-Host "   端口：5432"
Write-Host ""

# 测试 1: 基础连接测试
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【测试 1】基础数据库连接" -ForegroundColor Cyan
Write-Host ""

try {
    $result = psql "$dbConnection" -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 数据库连接成功！" -ForegroundColor Green
        Write-Host ""
        Write-Host $result.Trim() -ForegroundColor Gray
    } else {
        Write-Host "❌ 数据库连接失败！" -ForegroundColor Red
        Write-Host "错误信息：" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 发生异常：" $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""

# 测试 2: 验证当前数据库和用户
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【测试 2】验证数据库身份" -ForegroundColor Cyan
Write-Host ""

psql "$dbConnection" -c "SELECT current_database() AS database_name, current_user() AS current_user, session_user AS session_user;"

Write-Host ""

# 测试 3: 检查数据库基本信息
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【测试 3】数据库基本信息" -ForegroundColor Cyan
Write-Host ""

psql "$dbConnection" -c "SELECT 
    current_database() AS database_name,
    pg_catalog.pg_encoding_to_char(encoding) AS encoding,
    datcollate AS collation,
    datctype AS ctype
FROM pg_database 
WHERE datname = current_database();"

Write-Host ""

# 测试 4: 检查连接用户权限
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【测试 4】用户权限检查" -ForegroundColor Cyan
Write-Host ""

psql "$dbConnection" -c "SELECT 
    usename AS username,
    usesuper AS is_superuser,
    usecreatedb AS can_create_db,
    rolreplication AS can_replicate
FROM pg_user 
WHERE usename = current_user;"

Write-Host ""

# 测试 5: 测试 SSL 连接状态
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【测试 5】SSL 连接状态" -ForegroundColor Cyan
Write-Host ""

psql "$dbConnection" -c "SELECT 
    pg_is_ssl() AS is_ssl,
    current_setting('ssl') AS ssl_enabled;"

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ 所有连接验证测试完成！" -ForegroundColor Green
Write-Host ""
Write-Host "提示：" -ForegroundColor Yellow
Write-Host "- 如果看到 'postgres' 用户，说明使用的是直连模式" -ForegroundColor White
Write-Host "- 如果看到带项目前缀的用户，说明使用的是连接池模式" -ForegroundColor White
Write-Host "- 当前连接字符串已自动处理 SSL 模式" -ForegroundColor White
Write-Host ""
