#!/bin/bash

# ============================================================
# 通过 sql-exec 执行迁移
# ============================================================

set -e

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/sql-exec"

echo "Supabase URL: $SUPABASE_URL"
echo "Function URL: $FUNCTION_URL"
echo ""

# 读取迁移文件
MIGRATION_FILE="supabase/migrations/20250803000000_match_orders_complete.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "错误: 迁移文件不存在"
  exit 1
fi

# 读取 SQL 内容
SQL_CONTENT=$(cat "$MIGRATION_FILE")

# 创建临时 JSON 文件
TEMP_JSON=$(mktemp)
echo "{\"sql\":$(echo "$SQL_CONTENT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}" > "$TEMP_JSON"

echo "执行迁移..."
echo ""

# 执行迁移
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d @"$TEMP_JSON" \
  "$FUNCTION_URL")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP 状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))' 2>/dev/null || echo "$BODY"

# 清理临时文件
rm "$TEMP_JSON"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo ""
  echo "✓ 迁移执行成功！"
else
  echo ""
  echo "✗ 迁移执行失败"
  echo ""
  echo "请在 Supabase Dashboard SQL Editor 中手动执行迁移文件:"
  echo "文件路径: $MIGRATION_FILE"
fi
