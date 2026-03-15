#!/bin/bash

# Supabase Edge Functions 部署脚本
# 使用方法: ./scripts/deploy-functions.sh

# 函数列表
FUNCTIONS=(
  "admin-operations"
  "admin-verify"
  "api"
  "approve-trade-order"
  "auth-login"
  "bank-transfer"
  "campaign"
  "cancel-trade-order"
  "clear-cache"
  "crawler"
  "create-a-share-order"
  "create-block-trade-order"
  "create-hk-order"
  "create-ipo-order"
  "create-limit-up-order"
  "data-reports"
  "fetch-stock-f10"
  "fund-purchase"
  "fund-redeem"
  "fund-settle"
  "get-limit-up"
  "get-profile"
  "health-check"
  "match-orders"
  "match-trade-order-v2"
  "match-trade-order"
  "proxy-market"
  "risk-control"
  "run-migration"
  "sql-exec"
  "stock-search"
  "sync-ipo"
  "sync-stock-data"
  "system-config"
  "update-user-meta"
  "user-checkin"
  "user-vip"
  "wealth-purchase"
  "wealth-redeem"
)

# 部署计数
SUCCESS=0
FAILED=0

echo "=========================================="
echo "开始部署 Supabase Edge Functions"
echo "总计: ${#FUNCTIONS[@]} 个函数"
echo "=========================================="
echo ""

# 遍历部署
for func in "${FUNCTIONS[@]}"; do
  echo "正在部署: $func ..."
  
  if npx supabase functions deploy "$func" --use-api; then
    echo "✅ $func 部署成功"
    ((SUCCESS++))
  else
    echo "❌ $func 部署失败"
    ((FAILED++))
  fi
  echo ""
done

echo "=========================================="
echo "部署完成"
echo "成功: $SUCCESS 个"
echo "失败: $FAILED 个"
echo "=========================================="

# 如果有失败的函数，退出码为 1
if [ $FAILED -gt 0 ]; then
  exit 1
fi
