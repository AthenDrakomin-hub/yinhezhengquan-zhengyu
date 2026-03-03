# ============================================================
# 银河证券管理系统 - 创建迁移表脚本
# 功能：创建缺失的 migrations 表
# 使用方式：.\scripts\create-migrations-table.ps1
# ============================================================

param(
    [switch]$DryRun  # 只显示 SQL 不执行
)

Write-Host ""
Write-Host "**************************************************************" -ForegroundColor Cyan
Write-Host "*   Create Migrations Table                                  *" -ForegroundColor Cyan
Write-Host "**************************************************************" -ForegroundColor Cyan
Write-Host ""

# 从 .env 文件读取数据库连接字符串
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $dbUrlNonPooling = ($envContent | Where-Object { $_ -match "^DATABASE_URL_NON_POOLING=" }) -replace "^DATABASE_URL_NON_POOLING=", ""
    
    if ([string]::IsNullOrWhiteSpace($dbUrlNonPooling)) {
        Write-Host "[FAIL] DATABASE_URL_NON_POOLING not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[FAIL] .env file not found" -ForegroundColor Red
    exit 1
}

# Handle SSL mode
if ($dbUrlNonPooling -like "*sslmode=require*") {
    $dbConnection = $dbUrlNonPooling.Replace('sslmode=require', 'sslmode=disable')
} else {
    $dbConnection = $dbUrlNonPooling
}

Write-Host "Creating migrations table..." -ForegroundColor Yellow
Write-Host ""

# SQL to create migrations table
$sql = @"
-- Create migrations table for migration version control
CREATE TABLE IF NOT EXISTS public.migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum TEXT,
    execution_time_ms INTEGER,
    status TEXT DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_migrations_name ON public.migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON public.migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_status ON public.migrations(status);

-- Add comment
COMMENT ON TABLE public.migrations IS 'Migration version control table';
"@

if ($DryRun) {
    Write-Host "[DRY RUN] SQL Statement:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $sql
    Write-Host ""
} else {
    Write-Host "Executing SQL..." -ForegroundColor Yellow
    
    # Execute the SQL
    $result = psql "$dbConnection" -c $sql 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Migrations table created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Table structure:" -ForegroundColor Cyan
        
        # Show table structure
        psql "$dbConnection" -c "\d public.migrations"
        
        Write-Host ""
        Write-Host "Indexes:" -ForegroundColor Cyan
        
        # Show indexes
        psql "$dbConnection" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'migrations' AND schemaname = 'public';"
        
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "[FAIL] Failed to create migrations table" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
}

Write-Host "**************************************************************" -ForegroundColor Gray
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "**************************************************************" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Run alignment check again to verify:" -ForegroundColor White
Write-Host "   .\scripts\generate-db-alignment-report.ps1 -Quick" -ForegroundColor Gray
Write-Host ""
Write-Host "2. View detailed table information:" -ForegroundColor White
Write-Host "   .\scripts\compare-schema.ps1 -Detailed" -ForegroundColor Gray
Write-Host ""
