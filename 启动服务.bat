@echo off
chcp 65001 >nul
title 报价单生成器 - 本地服务

echo ========================================
echo     报价单生成器 - 本地开发服务
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [√] Node.js 已安装
node -v

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo.
    echo [*] 首次运行，正在安装依赖...
    echo     这可能需要几分钟，请耐心等待...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo.
    echo [√] 依赖安装完成
)

echo.
echo ========================================
echo  服务启动中...
echo  
echo  请在飞书多维表格中添加自定义扩展:
echo  URL: http://localhost:3000
echo  
echo  按 Ctrl+C 可停止服务
echo ========================================
echo.

:: 启动开发服务器
call npm run dev
