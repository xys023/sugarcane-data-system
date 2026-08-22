#!/bin/bash
# 甘蔗田间数据收集系统 - Linux/Mac 启动脚本

echo "========================================"
echo "  甘蔗田间数据收集系统 - 启动服务"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../server"

cd "$SERVER_DIR"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到Node.js，请先安装Node.js 18.x或更高版本"
    echo "下载地址：https://nodejs.org/"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install --registry=https://registry.npmmirror.com
fi

echo ""
echo "服务启动后，请在浏览器中访问："
echo "  PC端后台：http://localhost:3000"
echo "  默认账号：admin / admin123"
echo ""
echo "提示：按 Ctrl+C 停止服务"
echo "========================================"
echo ""

node server.js
