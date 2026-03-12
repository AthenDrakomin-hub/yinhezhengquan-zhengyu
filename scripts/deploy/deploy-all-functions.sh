#!/bin/bash

# Edge Functions 批量部署脚本
# 使用方法: bash deploy-all-functions.sh

echo "🚀 开始部署所有 Edge Functions..."
echo ""

PROJECT_REF="rfnrosyfeivcbkimjlwo"

# 部署函数列表
FUNCTIONS=(
  "admin-admin-operations"
  "market-fetch-galaxy-news"
  "market-fetch-stock-f10"
  "market-get-market-data"
  "sync-nexus-sync"
  "trade-approve-trade-order"
  "trade-cancel-trade-order"
  "trade-create-trade-order"
  "trade-match-trade-order"
)

SUCCESS=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
  echo "📦 部署 $func..."
  if supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
    echo "✅ $func 部署成功"
    ((SUCCESS++))
  else
    echo "❌ $func 部署失败"
    ((FAILED++))
  fi
  echo ""
done

echo "=================================="
echo "📊 部署统计:"
echo "   成功: $SUCCESS"
echo "   失败: $FAILED"
echo "=================================="

if [ $FAILED -eq 0 ]; then
  echo "✅ 所有函数部署成功!"
else
  echo "⚠️ 部分函数部署失败，请检查错误信息"
fi
