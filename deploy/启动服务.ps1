# ========================================
# 甘蔗田间数据收集系统 - 启动脚本 (PowerShell)
# 推荐使用此脚本启动，比bat更稳定
# 右键 -> 使用PowerShell运行 即可
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  甘蔗田间数据收集系统 - 启动服务" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 1. 定位到server目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $scriptDir "..\server"
$serverDir = Resolve-Path $serverDir

Write-Host "工作目录: $serverDir" -ForegroundColor Cyan
Write-Host ""

Set-Location $serverDir

# 2. 检查Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "[错误] 未检测到Node.js！请先安装 Node.js 22+ 版本" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/zh-cn/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 3. 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "[警告] 未检测到依赖包，正在自动安装..." -ForegroundColor Yellow
    Write-Host "首次安装需要几分钟，请耐心等待..." -ForegroundColor Yellow
    npm install --registry=https://registry.npmmirror.com
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 依赖安装失败，请检查网络连接" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "依赖安装完成！" -ForegroundColor Green
    Write-Host ""
}

# 4. 启动服务
Write-Host "========================================" -ForegroundColor Green
Write-Host "  服务正在启动..." -ForegroundColor Green
Write-Host "  启动后请在浏览器访问:" -ForegroundColor White
Write-Host "  PC端后台: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  默认账号: admin / admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "  提示: 关闭此窗口将停止服务" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

node server.js

Write-Host ""
Write-Host "服务已停止。" -ForegroundColor Yellow
Read-Host "按回车键退出"
