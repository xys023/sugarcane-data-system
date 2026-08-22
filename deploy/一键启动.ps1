# ========================================
# 甘蔗田间数据收集系统 - 一键启动脚本
# 功能：自动检查依赖 -> 自动安装(如需要) -> 启动服务
# 使用方法：右键此文件 -> "使用PowerShell运行"
# ========================================

$ErrorActionPreference = "Stop"

# 设置控制台编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   甘蔗田间数据收集系统 - 一键启动" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 1. 定位server目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $scriptDir "..\server"

if (-not (Test-Path $serverDir)) {
    Write-Host "[错误] 找不到 server 目录！请确认此脚本在 deploy 文件夹内。" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

$serverDir = Resolve-Path $serverDir
Set-Location $serverDir
Write-Host "工作目录: $serverDir" -ForegroundColor Cyan
Write-Host ""

# 2. 检查Node.js
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Cyan
    if ($majorVersion -lt 22) {
        Write-Host "[警告] Node.js版本过低，需要22或更高版本。当前: $nodeVersion" -ForegroundColor Yellow
        Write-Host "请从 https://nodejs.org/zh-cn/ 下载最新LTS版本" -ForegroundColor Yellow
        Read-Host "按回车键退出"
        exit 1
    }
} catch {
    Write-Host "[错误] 未检测到Node.js！" -ForegroundColor Red
    Write-Host "请先安装 Node.js 22+ 版本: https://nodejs.org/zh-cn/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 3. 检查并安装依赖
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "首次运行，正在安装依赖包..." -ForegroundColor Yellow
    Write-Host "（使用国内镜像源，通常需要1-3分钟，请耐心等待）" -ForegroundColor Gray
    Write-Host ""
    npm install --registry=https://registry.npmmirror.com
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[错误] 依赖安装失败！" -ForegroundColor Red
        Write-Host "请检查网络连接，或手动在server目录执行: npm install" -ForegroundColor Yellow
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host ""
    Write-Host "依赖安装完成！" -ForegroundColor Green
}

# 4. 启动服务
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  服务正在启动..." -ForegroundColor Green
Write-Host ""
Write-Host "  启动后请在浏览器访问:" -ForegroundColor White
Write-Host "  PC端后台: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API地址:  http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  默认管理员账号: admin / admin123" -ForegroundColor Yellow
Write-Host "  （登录后请及时修改密码）" -ForegroundColor Gray
Write-Host ""
Write-Host "  提示: 关闭此窗口将停止服务" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

node server.js

Write-Host ""
Write-Host "服务已停止。" -ForegroundColor Yellow
Read-Host "按回车键退出"
