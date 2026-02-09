@echo off
chcp 65001 >nul
title 构建便携版 EXE

echo ========================================
echo   构建报价单生成器便携版
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 请先安装 Node.js
    pause
    exit /b 1
)

:: 安装依赖
if not exist "node_modules" (
    echo [1/5] 安装项目依赖...
    call npm install
)

:: 安装 pkg
echo [2/5] 安装打包工具...
call npm install -g pkg

:: 构建前端
echo [3/5] 构建前端资源...
call npm run build

:: 创建输出目录
set "OUTPUT=报价单生成器"
if exist "%OUTPUT%" rmdir /s /q "%OUTPUT%"
mkdir "%OUTPUT%"

:: 复制 dist
echo [4/5] 复制文件...
xcopy /E /I /Y "dist" "%OUTPUT%\dist" >nul
copy /Y "server.js" "%OUTPUT%\" >nul

:: 打包 EXE
echo [5/5] 打包 EXE...
cd "%OUTPUT%"
call pkg server.js -t node18-win-x64 -o 启动服务.exe

:: 清理
del server.js 2>nul

cd ..
echo.
echo ========================================
echo   打包完成！
echo   
echo   输出目录: %OUTPUT%\
echo   ├── 启动服务.exe  (双击启动)
echo   └── dist\         (网页资源)
echo   
echo   将整个文件夹分发给用户即可
echo ========================================
echo.

pause
