#!/bin/bash

# ============================================================
# 撮合引擎部署脚本
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}撮合引擎部署脚本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 加载环境变量
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}✓ 已加载 .env 文件${NC}"
else
  echo -e "${YELLOW}⚠ 未找到 .env 文件${NC}"
  exit 1
fi

# 配置
SUPABASE_URL="${VITE_SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1"

# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}✗ 缺少必要的环境变量${NC}"
  echo "请确保 .env 文件中包含 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY"
  exit 1
fi

echo -e "${GREEN}✓ 环境变量检查通过${NC}"
echo ""

# ============================================================
# 第一步：执行数据库迁移
# ============================================================
echo -e "${YELLOW}第一步：执行数据库迁移${NC}"
echo ""

# 迁移 SQL
MIGRATION_SQL_1=$(cat <<'EOF'
-- ============================================================
-- 撮合引擎数据库表和视图
-- ============================================================

-- 创建撮合日志表
CREATE TABLE IF NOT EXISTS match_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  total_orders INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  partial_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  details JSONB DEFAULT '[]'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_match_logs_batch ON match_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_status ON match_logs(status);
CREATE INDEX IF NOT EXISTS idx_match_logs_started ON match_logs(started_at DESC);

-- 创建撮合统计视图
CREATE OR REPLACE VIEW match_statistics AS
SELECT
  DATE(started_at) as match_date,
  COUNT(*) as total_batches,
  SUM(total_orders) as total_orders,
  SUM(matched_count) as total_matched,
  SUM(failed_count) as total_failed,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms
FROM match_logs
WHERE status = 'COMPLETED'
GROUP BY DATE(started_at)
ORDER BY match_date DESC;

-- 创建应用配置表
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- 创建通知索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DO $$ BEGIN
    CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
EOF
)

MIGRATION_SQL_2=$(cat <<'EOF'
-- ============================================================
-- Realtime 配置
-- ============================================================

-- 为 trades 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trades;

-- 为 trade_executions 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trade_executions;

-- 为 notifications 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 为 match_logs 表启用 Realtime（监控用）
ALTER PUBLICATION supabase_realtime ADD TABLE match_logs;
EOF
)

# 执行迁移 1
echo -e "${BLUE}执行迁移 1/2: 创建撮合引擎表...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"sql\": $(echo "$MIGRATION_SQL_1" | jq -Rs .)}" \
  "${FUNCTION_URL}/sql-exec")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo -e "${GREEN}✓ 迁移 1 执行成功${NC}"
else
  echo -e "${RED}✗ 迁移 1 执行失败 (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  # 继续执行，可能表已存在
fi

# 执行迁移 2
echo -e "${BLUE}执行迁移 2/2: 配置 Realtime...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"sql\": $(echo "$MIGRATION_SQL_2" | jq -Rs .)}" \
  "${FUNCTION_URL}/sql-exec")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo -e "${GREEN}✓ 迁移 2 执行成功${NC}"
else
  echo -e "${YELLOW}⚠ 迁移 2 可能需要管理员权限 (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo -e "${YELLOW}请在 Supabase Dashboard SQL Editor 中手动执行:${NC}"
  echo "ALTER PUBLICATION supabase_realtime ADD TABLE trades;"
  echo "ALTER PUBLICATION supabase_realtime ADD TABLE trade_executions;"
  echo "ALTER PUBLICATION supabase_realtime ADD TABLE notifications;"
  echo "ALTER PUBLICATION supabase_realtime ADD TABLE match_logs;"
fi

echo ""

# ============================================================
# 第二步：部署 Edge Function
# ============================================================
echo -e "${YELLOW}第二步：部署 Edge Function${NC}"
echo ""

# 检查 Supabase CLI
if command -v supabase &> /dev/null; then
  echo -e "${GREEN}检测到 Supabase CLI${NC}"
  
  # 登录检查
  echo -e "${BLUE}检查登录状态...${NC}"
  
  # 部署函数
  echo -e "${BLUE}部署 match-orders 函数...${NC}"
  supabase functions deploy match-orders --no-verify-jwt
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ match-orders 函数部署成功${NC}"
  else
    echo -e "${RED}✗ match-orders 函数部署失败${NC}"
  fi
else
  echo -e "${YELLOW}未检测到 Supabase CLI${NC}"
  echo ""
  echo -e "${BLUE}请通过以下方式部署 Edge Function:${NC}"
  echo ""
  echo "方式1: 安装 Supabase CLI"
  echo "  npm install -g supabase"
  echo "  supabase login"
  echo "  supabase link --project-ref kvlvbhzrrpspzaoiormt"
  echo "  supabase functions deploy match-orders"
  echo ""
  echo "方式2: 通过 Dashboard 手动部署"
  echo "  1. 打开 https://supabase.com/dashboard/project/kvlvbhzrrpspzaoiormt/functions"
  echo "  2. 点击 'Create a new function'"
  echo "  3. 输入函数名: match-orders"
  echo "  4. 复制 supabase/functions/match-orders/index.ts 内容"
  echo "  5. 点击 'Deploy'"
  echo ""
fi

echo ""

# ============================================================
# 第三步：验证
# ============================================================
echo -e "${YELLOW}第三步：验证部署${NC}"
echo ""

# 测试撮合引擎
echo -e "${BLUE}测试撮合引擎...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{}' \
  "${FUNCTION_URL}/match-orders")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo -e "${GREEN}✓ 撮合引擎响应正常${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${YELLOW}⚠ 撮合引擎可能未部署 (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""

# ============================================================
# 完成
# ============================================================
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "下一步："
echo "1. 在 Supabase Dashboard 启用 pg_cron 扩展"
echo "2. 配置定时任务（每分钟触发撮合）"
echo "3. 设置环境变量: PROJECT_URL 和 SERVICE_ROLE_KEY"
echo ""
echo "详细文档: docs/MATCH_ORDERS_QUICK_START.md"
