# ============================================================
# 银河证券管理系统 - RLS 权限策略检查脚本
# 功能：检查行级安全策略配置
# 使用方式：.\scripts\check-rls-policies.ps1
# ============================================================

param(
    [switch]$Detailed,     # 显示详细的策略定义
    [switch]$FixSuggestions # 提供修复建议
)

Write-Host "🔒 开始 RLS 权限策略检查..." -ForegroundColor Cyan
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
Write-Host "【步骤 1】检查所有表的 RLS 启用状态" -ForegroundColor Cyan
Write-Host ""

$rlsStatusQuery = @"
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"@

$rlsStatus = psql "$dbConnection" -c $rlsStatusQuery

Write-Host $rlsStatus

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 2】统计 RLS 策略数量" -ForegroundColor Cyan
Write-Host ""

$policyCountQuery = @"
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;
"@

$policyCount = psql "$dbConnection" -c $policyCountQuery

Write-Host $policyCount

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 3】查看所有 RLS 策略详情" -ForegroundColor Cyan
Write-Host ""

$allPoliciesQuery = @"
SELECT 
    tablename,
    policyname,
    cmd AS operation,
    roles,
    qual AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"@

if ($Detailed) {
    $allPolicies = psql "$dbConnection" -c $allPoliciesQuery
    
    Write-Host $allPolicies
    
    Write-Host ""
    
    # 获取更详细的策略定义
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "【详细】策略完整定义" -ForegroundColor Cyan
    Write-Host ""
    
    $detailedPolicyQuery = @"
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"@
    
    $detailedPolicies = psql "$dbConnection" -c $detailedPolicyQuery
    Write-Host $detailedPolicies
} else {
    # 简要视图
    $briefPoliciesQuery = @"
SELECT 
    tablename,
    policyname,
    cmd AS operation,
    array_to_string(roles, ', ') AS applicable_roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
"@
    
    $briefPolicies = psql "$dbConnection" -c $briefPoliciesQuery
    Write-Host $briefPolicies
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 4】核心表 RLS 策略检查" -ForegroundColor Cyan
Write-Host ""

$coreTables = @(
    "profiles",
    "holdings",
    "transactions",
    "trades",
    "conditional_orders",
    "asset_snapshots"
)

foreach ($table in $coreTables) {
    Write-Host "`n📋 表：$table" -ForegroundColor Yellow
    Write-Host ("─" * 80) -ForegroundColor Gray
    
    # 检查表是否存在
    $tableExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" -t
    
    if ($tableExists.Trim() -eq "t") {
        # 检查 RLS 是否启用
        $rlsEnabled = psql "$dbConnection" -c "SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table';" -t
        
        if ($rlsEnabled.Trim() -eq "t") {
            Write-Host "  ✅ RLS 已启用" -ForegroundColor Green
            
            # 检查策略数量
            $policyCount = psql "$dbConnection" -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = '$table';" -t
            
            Write-Host "  策略数量：$policyCount" -ForegroundColor White
            
            # 列出策略
            $policies = psql "$dbConnection" -c "SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = '$table';" -t
            
            if ($policies -and $policies.Trim() -ne "") {
                Write-Host "  策略列表:" -ForegroundColor Cyan
                $policies | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                    Write-Host "    • $_" -ForegroundColor White
                }
            } else {
                Write-Host "  ⚠️  警告：RLS 已启用但没有定义策略" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ RLS 未启用" -ForegroundColor Red
            Write-Host "  风险：该表数据可能对未授权用户可见" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  表不存在" -ForegroundColor Yellow
    }
}

Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "【步骤 5】RLS 策略合规性检查" -ForegroundColor Cyan
Write-Host ""

# 检查是否有表启用了 RLS 但没有策略
$orphanRlsQuery = @"
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = true
    AND tablename NOT IN (
        SELECT DISTINCT tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    );
"@

$orphanRls = psql "$dbConnection" -c $orphanRlsQuery -t

if ($orphanRls -and $orphanRls.Trim() -ne "") {
    Write-Host "⚠️  警告：以下表启用了 RLS 但没有定义策略:" -ForegroundColor Yellow
    $orphanRls | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "✅ 所有启用 RLS 的表都有对应的策略" -ForegroundColor Green
}

Write-Host ""

# 检查 profiles 表的特殊策略
Write-Host "🔍 检查 profiles 表策略完整性:" -ForegroundColor Yellow

$profilesPolicyCheck = psql "$dbConnection" -c "SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';" -t

$expectedPolicies = @("Users view own profile", "Users update own profile")
$hasSelectPolicy = $false
$hasUpdatePolicy = $false

if ($profilesPolicyCheck -and $profilesPolicyCheck.Trim() -ne "") {
    $profilesPolicyCheck | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
        $policy = $_.Trim()
        if ($policy -like "*view*" -or $policy -like "*select*") {
            $hasSelectPolicy = $true
        }
        if ($policy -like "*update*" -or $policy -like "*edit*") {
            $hasUpdatePolicy = $true
        }
    }
}

if ($hasSelectPolicy) {
    Write-Host "  ✅ 包含 SELECT 策略" -ForegroundColor Green
} else {
    Write-Host "  ❌ 缺少 SELECT 策略" -ForegroundColor Red
}

if ($hasUpdatePolicy) {
    Write-Host "  ✅ 包含 UPDATE 策略" -ForegroundColor Green
} else {
    Write-Host "  ❌ 缺少 UPDATE 策略" -ForegroundColor Red
}

Write-Host ""

if ($FixSuggestions) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "【建议】修复建议" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "如果发现 RLS 问题，可以执行以下操作:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 为缺失策略的表添加 RLS 策略:" -ForegroundColor White
    Write-Host "   参考文件：supabase/migrations/20260301000000_fix_rls_policies.sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. 重新应用所有 RLS 策略:" -ForegroundColor White
    Write-Host "   psql `"connection_string`" -f supabase/migrations/20260301000000_fix_rls_policies.sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. 验证 RLS 策略是否生效:" -ForegroundColor White
    Write-Host "   运行此脚本再次检查" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ RLS 权限策略检查完成！" -ForegroundColor Green
Write-Host ""
Write-Host "提示：" -ForegroundColor Yellow
Write-Host "- 使用 -Detailed 参数查看完整的策略定义" -ForegroundColor White
Write-Host "- 使用 -FixSuggestions 参数获取修复建议" -ForegroundColor White
Write-Host ""
