@echo off
chcp 65001 >nul
title 打包便携版

echo ========================================
echo   打包报价单生成器便携版
echo ========================================
echo.

:: 创建输出目录
set "OUTPUT=报价单生成器-便携版"
if exist "%OUTPUT%" rmdir /s /q "%OUTPUT%"
mkdir "%OUTPUT%"
mkdir "%OUTPUT%\app"
mkdir "%OUTPUT%\node"

echo [1/4] 复制项目文件...
xcopy /E /I /Y "src" "%OUTPUT%\app\src" >nul
copy /Y "index.html" "%OUTPUT%\app\" >nul
copy /Y "package.json" "%OUTPUT%\app\" >nul
copy /Y "vite.config.js" "%OUTPUT%\app\" >nul
if exist "public" xcopy /E /I /Y "public" "%OUTPUT%\app\public" >nul

echo [2/4] 复制启动脚本...
copy /Y "portable\启动报价单生成器.bat" "%OUTPUT%\" >nul

echo [3/4] 请手动下载 Node.js 便携版...
echo.
echo   1. 访问: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
echo   2. 解压 zip 文件
echo   3. 将解压后文件夹内的所有文件复制到:
echo      %cd%\%OUTPUT%\node\
echo.
echo   确保 node 文件夹内有 node.exe 文件
echo.

echo [4/4] 完成后，将 "%OUTPUT%" 文件夹打包分发即可
echo.
echo ========================================
echo   打包结构:
echo   %OUTPUT%\
echo   ├── 启动报价单生成器.bat  (双击启动)
echo   ├── node\                 (Node.js便携版)
echo   │   ├── node.exe
echo   │   └── ...
echo   └── app\                  (项目代码)
echo       ├── src\
echo       ├── index.html
echo       └── ...
echo ========================================
echo.

pause
