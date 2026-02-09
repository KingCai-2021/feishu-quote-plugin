@echo off
chcp 65001 >nul
title 打包本地部署包

echo ╔════════════════════════════════════════════╗
echo ║   飞书报价单插件 - 打包本地部署包          ║
echo ╚════════════════════════════════════════════╝
echo.

:: 设置输出目录名
set "PKG=feishu-quote-plugin-deploy"

:: 清理旧的输出
if exist "%PKG%" rmdir /s /q "%PKG%"
if exist "%PKG%.zip" del "%PKG%.zip"

:: 检查 dist 目录
if not exist "dist\index.html" (
    echo [!] dist 目录不存在，先执行构建...
    where node >nul 2>nul
    if %errorlevel% neq 0 (
        echo [错误] 未安装 Node.js，请先运行 npm run build
        pause
        exit /b 1
    )
    call npm run build
    if %errorlevel% neq 0 (
        echo [错误] 构建失败
        pause
        exit /b 1
    )
)

echo [1/3] 创建部署包目录...
mkdir "%PKG%"

echo [2/3] 复制文件...
:: 复制 dist（构建产物）
xcopy /E /I /Y "dist" "%PKG%\dist" >nul

:: 复制 server.js（Node.js 静态服务器）
copy /Y "server.js" "%PKG%\" >nul

:: 创建启动脚本
echo [3/3] 生成启动脚本...

:: 生成 Windows 启动脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo title 飞书报价单插件 - 本地服务
echo.
echo :: 检查 Node.js
echo where node ^>nul 2^>nul
echo if %%errorlevel%% neq 0 ^(
echo     echo [错误] 未检测到 Node.js
echo     echo 请下载安装: https://nodejs.org/
echo     echo.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo ╔════════════════════════════════════════════╗
echo echo ║   飞书报价单插件 - 服务启动中...          ║
echo echo ╚════════════════════════════════════════════╝
echo echo.
echo node server.js
echo pause
) > "%PKG%\启动服务.bat"

:: 生成 Nginx 配置示例
(
echo # Nginx 配置示例 - 飞书报价单插件
echo # 将 dist 目录复制到服务器后，使用此配置
echo #
echo # 用法：
echo #   1. 修改 root 路径为你的实际 dist 目录
echo #   2. 将此配置添加到 nginx.conf 的 http 块中
echo #   3. nginx -s reload
echo.
echo server {
echo     listen       3000;
echo     server_name  _;
echo.
echo     # 修改为你的实际路径
echo     root /path/to/feishu-quote-plugin-deploy/dist;
echo     index index.html;
echo.
echo     # CORS（飞书多维表格需要）
echo     add_header Access-Control-Allow-Origin * always;
echo     add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
echo     add_header Access-Control-Allow-Headers 'Content-Type' always;
echo.
echo     gzip on;
echo     gzip_types text/plain text/css text/javascript application/json application/javascript;
echo.
echo     location / {
echo         try_files $uri $uri/ /index.html;
echo     }
echo.
echo     if ^($request_method = 'OPTIONS'^) {
echo         return 204;
echo     }
echo }
) > "%PKG%\nginx-example.conf"

echo.
echo ════════════════════════════════════════════
echo   打包完成！
echo.
echo   输出目录: %PKG%\
echo     ├── dist\              静态资源
echo     ├── server.js          Node.js 服务器
echo     ├── 启动服务.bat       双击启动
echo     ├── nginx-example.conf Nginx 配置示例
echo     └── README.txt         部署说明
echo.
echo   将整个 %PKG% 文件夹复制到目标机器即可
echo ════════════════════════════════════════════
echo.
pause
