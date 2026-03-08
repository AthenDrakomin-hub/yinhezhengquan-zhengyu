#!/bin/bash
# 启动银禾数据库代理服务

echo "========================================"
echo "   银禾数据库数据代理服务启动脚本"
echo "========================================"

# 进入项目目录
cd /workspace/projects

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

# 检查依赖
echo "📦 检查 Python 依赖..."
pip3 install fastapi uvicorn -q

# 检查 yinhedata 库
python3 -c "import yinhedata" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ yinhedata 库已安装"
else
    echo "⚠️  yinhedata 库未安装"
    echo "   安装命令: pip install yinhedata"
    echo "   服务将使用模拟数据"
fi

# 启动服务
echo ""
echo "🚀 启动数据代理服务..."
echo "   地址: http://localhost:8080"
echo "   文档: http://localhost:8080/docs"
echo ""

python3 api/yinhedata_service.py
