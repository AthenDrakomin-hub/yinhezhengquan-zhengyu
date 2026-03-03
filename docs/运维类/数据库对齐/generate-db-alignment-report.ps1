# ============================================================
# Galaxy Securities - Database Alignment Report Script
# Usage: .\scripts\generate-db-alignment-report.ps1
# ============================================================

param(
    [switch]$Quick,
    [switch]$ExportReport,
    [switch]$Verbose
)

$startTime = Get-Date
$reportLines = @()

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Gray
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Gray
    Write-Host ""
}

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    
    if ($Status -eq "OK") {
        Write-Host "[OK] $Message" -ForegroundColor Green
    } elseif ($Status -eq "FAIL") {
        Write-Host "[FAIL] $Message" -ForegroundColor Red
    } elseif ($Status -eq "WARN") {
        Write-Host "[WARN] $Message" -ForegroundColor Yellow
    } else {
        Write-Host "[INFO] $Message" -ForegroundColor White
    }
    
    $reportLines += "$Status : $Message"
}

Write-Host ""
Write-Host "**************************************************************" -ForegroundColor Cyan
Write-Host "*   Galaxy Securities - Database Alignment Report           *" -ForegroundColor Cyan
Write-Host "**************************************************************" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host "Project Ref: rfnrosyfeivcbkimjlwo" -ForegroundColor Yellow
Write-Host ""

# Read database connection string from .env
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $dbUrlNonPooling = ($envContent | Where-Object { $_ -match "^DATABASE_URL_NON_POOLING=" }) -replace "^DATABASE_URL_NON_POOLING=", ""
    
    if ([string]::IsNullOrWhiteSpace($dbUrlNonPooling)) {
        Write-Status "DATABASE_URL_NON_POOLING not found" "FAIL"
        exit 1
    }
} else {
    Write-Status ".env file not found" "FAIL"
    exit 1
}

# Handle SSL mode - use disable instead of no-verify for psql 18.x
if ($dbUrlNonPooling -like "*sslmode=require*") {
    $dbConnection = $dbUrlNonPooling.Replace('sslmode=require', 'sslmode=disable')
} else {
    $dbConnection = $dbUrlNonPooling
}

# Statistics
$stats = @{
    TotalTables = 0
    CoreTablesPresent = 0
    CoreTablesMissing = 0
    RLSEnabledTables = 0
    TotalPolicies = 0
    TotalDataRows = 0
    IssuesFound = 0
}

$coreTables = @(
    "profiles", "holdings", "transactions", "trades", "conditional_orders",
    "asset_snapshots", "ipos", "block_trade_products", "limit_up_stocks",
    "fund_flows", "admin_operation_logs", "migrations"
)

Write-Section "Module 1: Connection Verification"

try {
    $versionResult = psql "$dbConnection" -c "SELECT version();" -t 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Database connection successful" "OK"
        
        $dbInfo = psql "$dbConnection" -c "SELECT current_database() AS database, current_user() AS user_name;" -t
        Write-Host "   Database: $dbInfo" -ForegroundColor White
    } else {
        Write-Status "Database connection failed" "FAIL"
        $stats.IssuesFound++
    }
} catch {
    Write-Status "Connection error: $($_.Exception.Message)" "FAIL"
    $stats.IssuesFound++
}

if (-not $Quick) {
    Write-Section "Module 2: Schema Alignment Check"
    
    # Get all tables
    $remoteTablesResult = psql "$dbConnection" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" -t
    $remoteTables = ($remoteTablesResult | Where-Object { $_.Trim() -ne "" }) | ForEach-Object { $_.Trim() }
    $stats.TotalTables = $remoteTables.Count
    
    Write-Status "Total tables in remote database: $($stats.TotalTables)" "INFO"
    Write-Host ""
    
    # Check core tables
    Write-Host "Core Tables Check:" -ForegroundColor Cyan
    
    foreach ($table in $coreTables) {
        if ($remoteTables -contains $table) {
            Write-Status "$table exists" "OK"
            $stats.CoreTablesPresent++
            
            # Check column count
            $columnCount = psql "$dbConnection" -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table';" -t
            if ($columnCount -and $columnCount.Trim()) {
                Write-Host "     Columns: $($columnCount.Trim())" -ForegroundColor Gray
            }
        } else {
            Write-Status "$table missing" "FAIL"
            $stats.CoreTablesMissing++
            $stats.IssuesFound++
        }
    }
    
    Write-Host ""
    Write-Host "Core Tables Summary:" -ForegroundColor Yellow
    Write-Host "  Expected: $($coreTables.Count)" -ForegroundColor White
    Write-Host "  Present: $($stats.CoreTablesPresent)" -ForegroundColor Green
    Write-Host "  Missing: $($stats.CoreTablesMissing)" -ForegroundColor Red
    Write-Host ""
}

Write-Section "Module 3: RLS Policy Check"

# RLS status
$rlsStatusQuery = @"
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"@

$rlsStatus = psql "$dbConnection" -c $rlsStatusQuery
$rlsEnabledList = $rlsStatus | Where-Object { $_ -like "*t*" }
$stats.RLSEnabledTables = @($rlsEnabledList).Count

# Policy count
$policyCountQuery = "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';"
$totalPolicies = psql "$dbConnection" -c $policyCountQuery -t
$stats.TotalPolicies = $totalPolicies.Trim()

Write-Status "Tables with RLS enabled: $($stats.RLSEnabledTables)" "INFO"
Write-Status "Total RLS policies: $($stats.TotalPolicies)" "INFO"
Write-Host ""

# Check profiles table policies
Write-Host "Profiles Table Policies:" -ForegroundColor Cyan
$profilesPolicies = psql "$dbConnection" -c "SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';" -t

if ($profilesPolicies -and $profilesPolicies.Trim() -ne "") {
    Write-Status "Profiles table has RLS policies" "OK"
    $profilesPolicies | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
        Write-Host "     $_" -ForegroundColor Gray
    }
} else {
    Write-Status "Profiles table missing RLS policies" "FAIL"
    $stats.IssuesFound++
}

Write-Host ""

if (-not $Quick) {
    Write-Section "Module 4: Data Statistics"
    
    # Data volume statistics
    Write-Host "Core Tables Data Volume:" -ForegroundColor Cyan
    
    foreach ($table in $coreTables) {
        if ($remoteTables -contains $table) {
            $count = psql "$dbConnection" -c "SELECT COUNT(*) FROM $table;" -t
            $rowCount = $count.Trim()
            $stats.TotalDataRows += [int]$rowCount
            
            Write-Host "  $table : $rowCount rows" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "Total Rows: $($stats.TotalDataRows)" -ForegroundColor Yellow
    Write-Host ""
    
    # Admin accounts check
    Write-Host "Admin Accounts Check:" -ForegroundColor Cyan
    $adminCount = psql "$dbConnection" -c "SELECT COUNT(*) FROM profiles WHERE role LIKE '%admin%';" -t
    
    if ([int]$adminCount.Trim() -gt 0) {
        Write-Status "Found $($adminCount.Trim()) admin accounts" "OK"
    } else {
        Write-Status "No admin accounts found" "WARN"
    }
    
    Write-Host ""
}

Write-Section "Module 5: Extensions and Functions Check"

# Critical extensions check
$requiredExtensions = @("uuid-ossp", "pgcrypto")
Write-Host "Required Extensions:" -ForegroundColor Cyan

foreach ($ext in $requiredExtensions) {
    $extExists = psql "$dbConnection" -c "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = '$ext');" -t
    
    if ($extExists.Trim() -eq "t") {
        Write-Status "$ext installed" "OK"
    } else {
        Write-Status "$ext not installed" "FAIL"
        $stats.IssuesFound++
    }
}

Write-Host ""

# Migration system functions check
Write-Host "Migration System Functions:" -ForegroundColor Cyan
$migrationFuncCount = psql "$dbConnection" -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('table_exists', 'column_exists', 'index_exists', 'policy_exists', 'migration_applied');" -t

if ([int]$migrationFuncCount.Trim() -ge 5) {
    Write-Status "Migration functions installed ($migrationFuncCount functions)" "OK"
} else {
    Write-Status "Migration functions incomplete" "FAIL"
    $stats.IssuesFound++
}

Write-Host ""

Write-Section "Summary"

$endTime = Get-Date
$duration = New-TimeSpan -Start $startTime -End $endTime

Write-Host "Completed: $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Yellow
Write-Host "Duration: $($duration.Seconds) seconds" -ForegroundColor Yellow
Write-Host ""

Write-Host "Statistics:" -ForegroundColor Cyan
Write-Host "  - Total Tables: $($stats.TotalTables)" -ForegroundColor White
Write-Host "  - Core Tables Present: $($stats.CoreTablesPresent) / $($coreTables.Count)" -ForegroundColor White
Write-Host "  - Tables with RLS: $($stats.RLSEnabledTables)" -ForegroundColor White
Write-Host "  - RLS Policies: $($stats.TotalPolicies)" -ForegroundColor White
Write-Host "  - Total Data Rows: $($stats.TotalDataRows)" -ForegroundColor White
Write-Host ""

if ($stats.IssuesFound -eq 0) {
    Write-Host "************************************************************" -ForegroundColor Green
    Write-Host "*  All Checks Passed!                                       *" -ForegroundColor Green
    Write-Host "************************************************************" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database is in good condition and aligned with local project design." -ForegroundColor Gray
} else {
    Write-Host "************************************************************" -ForegroundColor Red
    Write-Host "*  Found $($stats.IssuesFound) issue(s) requiring attention              *" -ForegroundColor Red
    Write-Host "************************************************************" -ForegroundColor Red
    Write-Host ""
    Write-Host "Recommended Actions:" -ForegroundColor Yellow
    Write-Host "  1. Review detailed report above to identify issues" -ForegroundColor White
    Write-Host "  2. Execute corresponding migration files to fix missing tables/fields" -ForegroundColor White
    Write-Host "  3. Re-run this script to verify fixes" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "**************************************************************" -ForegroundColor Gray
Write-Host "Additional Scripts Available:" -ForegroundColor Cyan
Write-Host "**************************************************************" -ForegroundColor Gray
Write-Host ""
Write-Host "  - verify-db-connection.ps1      - Detailed connection test" -ForegroundColor White
Write-Host "  - compare-schema.ps1            - Schema comparison" -ForegroundColor White
Write-Host "  - check-data-consistency.ps1    - Data consistency check" -ForegroundColor White
Write-Host "  - check-rls-policies.ps1        - RLS policy details" -ForegroundColor White
Write-Host "  - check-extensions-config.ps1   - Extensions and config" -ForegroundColor White
Write-Host ""

# Export report to file
if ($ExportReport) {
    $outputDir = Join-Path $PSScriptRoot "..\database\reports"
    
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $outputFile = Join-Path $outputDir "alignment_report_$timestamp.txt"
    
    $reportContent = "Galaxy Securities - Database Alignment Report`r`n"
    $reportContent += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n"
    $reportContent += "Project Ref: rfnrosyfeivcbkimjlwo`r`n"
    $reportContent += ("=" * 60) + "`r`n`r`n"
    
    foreach ($line in $reportLines) {
        $reportContent += $line + "`r`n"
    }
    
    $reportContent | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "[OK] Report exported to: $outputFile" -ForegroundColor Green
}

Write-Host ""
