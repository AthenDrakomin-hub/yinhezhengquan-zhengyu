#!/bin/bash

# ============================================================
# 撮合引擎测试脚本
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/match-orders"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}撮合引擎测试脚本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 检查环境变量
if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${YELLOW}警告: SUPABASE_ANON_KEY 未设置${NC}"
  echo "请设置环境变量或在 .env 文件中配置"
  exit 1
fi

# 测试函数：发送请求
test_request() {
  local method=$1
  local url=$2
  local data=$3
  local description=$4

  echo -e "\n${BLUE}测试: ${description}${NC}"
  echo -e "URL: ${url}"
  
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -d "$data" \
      "$url")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      "$url")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ 成功 (HTTP $http_code)${NC}"
    echo "响应: $body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
    echo "响应: $body"
  fi
}

# 1. 测试健康检查
echo -e "\n${YELLOW}1. 测试健康检查${NC}"
test_request "GET" "${SUPABASE_URL}/functions/v1/health-check" "" "健康检查"

# 2. 测试撮合引擎（空池）
echo -e "\n${YELLOW}2. 测试撮合引擎（空池）${NC}"
test_request "POST" "$FUNCTION_URL" "{}" "触发撮合引擎"

# 3. 创建测试订单（买单）
echo -e "\n${YELLOW}3. 创建测试买单${NC}"
buy_order_data='{
  "market_type": "A_SHARE",
  "stock_code": "600000",
  "stock_name": "浦发银行",
  "trade_type": "BUY",
  "price": 10.50,
  "quantity": 1000
}'
test_request "POST" "${SUPABASE_URL}/functions/v1/create-a-share-order" "$buy_order_data" "创建买单"

# 4. 创建测试订单（卖单）
echo -e "\n${YELLOW}4. 创建测试卖单${NC}"
sell_order_data='{
  "market_type": "A_SHARE",
  "stock_code": "600000",
  "stock_name": "浦发银行",
  "trade_type": "SELL",
  "price": 10.45,
  "quantity": 500
}'
test_request "POST" "${SUPABASE_URL}/functions/v1/create-a-share-order" "$sell_order_data" "创建卖单"

# 5. 触发撮合
echo -e "\n${YELLOW}5. 触发撮合引擎${NC}"
test_request "POST" "$FUNCTION_URL" "{}" "撮合订单"

# 6. 查询撮合日志
echo -e "\n${YELLOW}6. 查询撮合日志${NC}"
test_request "GET" "${SUPABASE_URL}/rest/v1/match_logs?select=*&order=started_at.desc&limit=5" "" "查询撮合日志"

# 7. 查询成交记录
echo -e "\n${YELLOW}7. 查询成交记录${NC}"
test_request "GET" "${SUPABASE_URL}/rest/v1/trade_executions?select=*&order=matched_at.desc&limit=5" "" "查询成交记录"

# 8. 测试部分成交
echo -e "\n${YELLOW}8. 测试部分成交${NC}"
partial_sell_data='{
  "market_type": "A_SHARE",
  "stock_code": "600000",
  "stock_name": "浦发银行",
  "trade_type": "SELL",
  "price": 10.50,
  "quantity": 300
}'
test_request "POST" "${SUPABASE_URL}/functions/v1/create-a-share-order" "$partial_sell_data" "创建部分成交卖单"
test_request "POST" "$FUNCTION_URL" "{}" "撮合部分成交"

# 测试完成
echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}测试完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "下一步："
echo "1. 检查撮合日志: SELECT * FROM match_logs ORDER BY started_at DESC LIMIT 5;"
echo "2. 检查成交记录: SELECT * FROM trade_executions ORDER BY matched_at DESC LIMIT 5;"
echo "3. 检查订单状态: SELECT * FROM trades WHERE status IN ('SUCCESS', 'PARTIAL') ORDER BY created_at DESC;"
echo ""
echo "部署定时任务："
echo "1. 在 Supabase Dashboard 启用 pg_cron 扩展"
echo "2. 执行迁移文件: supabase/migrations/20250801000000_match_orders_cron.sql"
echo "3. 设置环境变量: project_url 和 service_role_key"
