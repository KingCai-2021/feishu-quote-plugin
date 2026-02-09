# 打包便携版 EXE 启动器

## 方案：使用 Node.js 便携版 + 批处理打包

### 步骤 1：下载 Node.js 便携版

1. 访问 https://nodejs.org/en/download/
2. 下载 Windows Binary (.zip) 版本（不是安装版）
3. 解压到项目的 `node-portable` 文件夹

### 步骤 2：项目结构

```
报价单生成器/
├── node-portable/          # Node.js 便携版
│   ├── node.exe
│   ├── npm.cmd
│   └── ...
├── app/                    # 项目代码
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── ...
├── 启动服务.bat            # 启动脚本
└── 启动服务.exe            # 可选：bat转exe
```

### 步骤 3：将 bat 转换为 exe

使用 Bat To Exe Converter：
1. 下载 https://bat-to-exe-converter-x64.en.softonic.com/
2. 打开 启动服务.bat
3. 设置图标（可选）
4. 点击 Compile 生成 exe

或使用 iexpress（Windows 自带）：
1. 运行 iexpress
2. 创建自解压包
