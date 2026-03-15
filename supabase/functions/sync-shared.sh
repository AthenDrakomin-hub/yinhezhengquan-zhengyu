#!/bin/bash
# 同步 _shared 代码到所有需要的 Edge Functions
# 用法: ./sync-shared.sh

set -e

SHARED_DIR="supabase/functions/_shared"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 同步 _shared 代码到所有 Edge Functions ==="

# 找到所有使用 ./_shared 的函数
dirs=$(grep -l "./_shared" supabase/functions/*/index.ts 2>/dev/null | xargs -I{} dirname {} || true)

if [ -z "$dirs" ]; then
  echo "没有找到需要同步的函数"
  exit 0
fi

count=0
for dir in $dirs; do
  name=$(basename $dir)
  echo "  同步到: $name"
  
  # 删除旧的 _shared 目录
  rm -rf "$dir/_shared"
  
  # 复制新的 _shared 目录
  cp -r "$SHARED_DIR" "$dir/"
  
  count=$((count + 1))
done

echo ""
echo "✅ 已同步到 $count 个函数"
