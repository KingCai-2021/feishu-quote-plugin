@echo off
chcp 65001 >nul
title 报价单生成器

:: 获取当前目录
set "ROOT=%~dp0"
cd /d "%ROOT%"

:: 设置便携版 Node.js 路径
set "NODE_PATH=%ROOT%node"
set "PATH=%NODE_PATH%;%PATH%"

echo.
echo  ╔════════════════════════════════════════╗
echo  ║      报价单生成器 - 本地服务           ║
echo  ╠════════════════════════════════════════╣
echo  ║                                        ║
echo  ║  服务启动后，请在飞书多维表格中        ║
echo  ║  添加扩展脚本地址:                     ║
echo  ║                                        ║
echo  ║     http://localhost:3000              ║
echo  ║                                        ║
echo  ║  按 Ctrl+C 可停止服务                  ║
echo  ╚════════════════════════════════════════╝
echo.

:: 检查 node 是否存在
if not exist "%NODE_PATH%\node.exe" (
    echo [错误] 未找到 Node.js，请确保 node 文件夹存在
    pause
    exit /b 1
)

:: 进入应用目录
cd /d "%ROOT%app"

:: 检查依赖
if not exist "node_modules" (
    echo [*] 首次运行，正在安装依赖...
    call "%NODE_PATH%\npm.cmd" install --registry=https://registry.npmmirror.com
    echo.
)

:: 启动服务
echo [√] 正在启动服务...
echo.
call "%NODE_PATH%\npx.cmd" vite --host --port 3000

pause
