#!/bin/bash

# ========================================================
# 银河证券正裕交易系统 - 部署检查脚本
# 功能：验证系统部署状态、环境配置、服务可用性
# ========================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "  $1"
}

# 检查结果统计
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

check_pass() {
    ((PASS_COUNT++))
    print_success "$1"
}

check_fail() {
    ((FAIL_COUNT++))
    print_error "$1"
}

check_warn() {
    ((WARN_COUNT++))
    print_warning "$1"
}

# ========================================================
# 1. 环境变量检查
# ========================================================
print_header "1. 环境变量检查"

# 检查 .env 文件
if [ -f ".env" ]; then
    check_pass ".env 文件存在"
else
    check_fail ".env 文件不存在"
fi

# 检查关键环境变量
ENV_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "VITE_SUPABASE_FUNCTION_URL"
)

for var in "${ENV_VARS[@]}"; do
    if grep -q "^$var=" .env 2>/dev/null; then
        check_pass "$var 已配置"
    else
        check_fail "$var 未配置"
    fi
done

# ========================================================
# 2. 依赖检查
# ========================================================
print_header "2. 依赖检查"

# 检查 Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js 已安装 ($NODE_VERSION)"
else
    check_fail "Node.js 未安装"
fi

# 检查 npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm 已安装 ($NPM_VERSION)"
else
    check_fail "npm 未安装"
fi

# 检查 node_modules
if [ -d "node_modules" ]; then
    check_pass "node_modules 存在"
else
    check_warn "node_modules 不存在，请运行 npm install"
fi

# ========================================================
# 3. 项目结构检查
# ========================================================
print_header "3. 项目结构检查"

# 检查关键目录
DIRS=(
    "components"
    "services"
    "lib"
    "contexts"
    "supabase/functions"
    "supabase/migrations"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "$dir/ 目录存在"
    else
        check_fail "$dir/ 目录不存在"
    fi
done

# 检查关键文件
FILES=(
    "package.json"
    "tsconfig.json"
    "vite.config.ts"
    "index.html"
    "OptimizedApp.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file 存在"
    else
        check_fail "$file 不存在"
    fi
done

# ========================================================
# 4. TypeScript 编译检查
# ========================================================
print_header "4. TypeScript 编译检查"

if npx tsc --noEmit 2>/dev/null; then
    check_pass "TypeScript 编译通过"
else
    check_fail "TypeScript 编译失败"
fi

# ========================================================
# 5. Edge Functions 检查
# ========================================================
print_header "5. Edge Functions 检查"

FUNCTIONS=(
    "admin-operations"
    "admin-verify"
    "campaign"
    "create-a-share-order"
    "data-reports"
    "fund-purchase"
    "fund-redeem"
    "match-trade-order"
    "proxy-market"
    "risk-control"
    "sync-ipo"
    "sync-stock-data"
    "system-config"
    "user-checkin"
    "user-vip"
    "wealth-purchase"
    "wealth-redeem"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -f "supabase/functions/$func/index.ts" ]; then
        check_pass "$func 存在"
    else
        check_fail "$func 不存在"
    fi
done

# ========================================================
# 6. 数据库迁移文件检查
# ========================================================
print_header "6. 数据库迁移文件检查"

MIGRATIONS=(
    "20250327000000_init.sql"
    "20250615000000_phase1_core_trading.sql"
    "20250620000000_phase2_fund_wealth.sql"
    "20250625000000_phase3_vip_points_campaign.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "supabase/migrations/$migration" ]; then
        check_pass "$migration 存在"
    else
        check_warn "$migration 不存在（可能需要创建）"
    fi
done

# ========================================================
# 7. 构建检查
# ========================================================
print_header "7. 构建检查"

if npm run build 2>/dev/null; then
    check_pass "项目构建成功"
    
    # 检查 dist 目录
    if [ -d "dist" ]; then
        check_pass "dist/ 目录生成成功"
    else
        check_fail "dist/ 目录未生成"
    fi
else
    check_fail "项目构建失败"
fi

# ========================================================
# 8. 共享模块检查
# ========================================================
print_header "8. 共享模块检查"

SHARED_MODULES=(
    "mod.ts"
    "types.ts"
    "response.ts"
    "auth.ts"
    "admin.ts"
    "validation.ts"
    "cache.ts"
    "database.ts"
    "trading.ts"
)

for module in "${SHARED_MODULES[@]}"; do
    if [ -f "supabase/functions/_shared/$module" ]; then
        check_pass "_shared/$module 存在"
    else
        check_fail "_shared/$module 不存在"
    fi
done

# ========================================================
# 9. 服务层检查
# ========================================================
print_header "9. 服务层检查"

SERVICES=(
    "authService.ts"
    "tradeService.ts"
    "fundService.ts"
    "wealthService.ts"
    "vipService.ts"
    "checkinService.ts"
    "campaignService.ts"
    "riskControlService.ts"
    "reportService.ts"
)

for service in "${SERVICES[@]}"; do
    if [ -f "services/$service" ]; then
        check_pass "$service 存在"
    else
        check_fail "$service 不存在"
    fi
done

# ========================================================
# 10. 管理后台组件检查
# ========================================================
print_header "10. 管理后台组件检查"

ADMIN_COMPONENTS=(
    "AdminLayout.tsx"
    "AdminDashboard.tsx"
    "AdminUserManagement.tsx"
    "AdminTradeManagement.tsx"
    "AdminCampaignManagement.tsx"
    "AdminRiskControl.tsx"
    "AdminReports.tsx"
    "AdminSystemConfig.tsx"
)

for component in "${ADMIN_COMPONENTS[@]}"; do
    if [ -f "components/admin/$component" ]; then
        check_pass "$component 存在"
    else
        check_fail "$component 不存在"
    fi
done

# ========================================================
# 汇总报告
# ========================================================
print_header "部署检查汇总报告"

echo -e "${GREEN}通过: $PASS_COUNT${NC}"
echo -e "${RED}失败: $FAIL_COUNT${NC}"
echo -e "${YELLOW}警告: $WARN_COUNT${NC}"

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
SCORE=$((PASS_COUNT * 100 / TOTAL))

echo -e "\n健康度评分: ${SCORE}%"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}✓ 系统部署检查通过！${NC}"
    echo -e "系统已准备好进行部署。"
    exit 0
else
    echo -e "\n${RED}✗ 系统部署检查未通过！${NC}"
    echo -e "请修复上述失败项后重新检查。"
    exit 1
fi
