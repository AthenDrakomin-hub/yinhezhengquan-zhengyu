#!/bin/bash

# 银河证券颜色统一脚本
# 将所有不一致的颜色替换为银河证券官方配色

echo "🎨 开始统一银河证券配色..."

# 定义颜色映射
# #00D4AA -> var(--color-primary) 或 #E63946（银河红）
# #0055A4 -> var(--color-secondary) 或 #0066CC（科技蓝）
# #0A1628 -> 删除或替换为合适的颜色

# 1. 替换主色调（青色 -> 银河红）
echo "替换主色调 #00D4AA -> #E63946..."
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/#00D4AA/#E63946/g'

# 2. 替换辅助色（深蓝 -> 科技蓝）
echo "替换辅助色 #0055A4 -> #0066CC..."
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/#0055A4/#0066CC/g'

# 3. 替换深色背景
echo "替换深色背景 #0A1628 -> #1E1E1E..."
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/#0A1628/#1E1E1E/g'

# 4. 替换深蓝渐变
echo "替换深蓝渐变 #003D73 -> #004C99..."
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/#003D73/#004C99/g'

echo "✅ 颜色统一完成！"
echo ""
echo "📊 替换统计："
echo "  - #00D4AA -> #E63946 (银河红)"
echo "  - #0055A4 -> #0066CC (科技蓝)"
echo "  - #0A1628 -> #1E1E1E (深色背景)"
echo "  - #003D73 -> #004C99 (深蓝渐变)"
