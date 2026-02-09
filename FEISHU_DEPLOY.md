# 飞书部署指南

## 方式一：飞书小组件（推荐）

### 1. 创建飞书应用
1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 点击「创建应用」→「企业自建应用」
3. 填写应用名称：排版打印插件
4. 获取 App ID 和 App Secret

### 2. 添加小组件能力
1. 在应用详情页，点击「添加应用能力」
2. 选择「小组件」
3. 配置小组件信息

### 3. 部署前端代码
```bash
# 构建项目
npm run build

# 将 dist 目录上传到飞书开放平台
```

### 4. 发布应用
1. 提交审核
2. 审核通过后发布
3. 在飞书工作台添加应用

---

## 方式二：飞书网页应用

### 1. 部署到服务器
将构建后的代码部署到你的服务器（如 Nginx、Vercel、Netlify）

### 2. 创建网页应用
1. 飞书开放平台 → 创建应用 → 网页应用
2. 配置应用主页 URL（你的部署地址）
3. 配置安全域名

### 3. 添加到工作台
发布后，用户可在飞书工作台打开

---

## 方式三：飞书多维表格插件

如果主要用于数据处理，可以开发为多维表格插件：

### 1. 安装飞书插件 SDK
```bash
npm install @lark-base-open/js-sdk
```

### 2. 初始化 SDK
```javascript
import { bitable } from '@lark-base-open/js-sdk';

// 获取当前表格数据
const table = await bitable.base.getActiveTable();
const records = await table.getRecords();
```

### 3. 开发插件
参考：https://open.feishu.cn/document/uAjLw4CM/uYjL24iN/block/guide

---

## 方式四：飞书机器人 + 网页

### 1. 创建机器人
在飞书开放平台创建机器人应用

### 2. 配置消息卡片
发送包含网页链接的消息卡片，用户点击后打开插件

```json
{
  "config": { "wide_screen_mode": true },
  "elements": [{
    "tag": "action",
    "actions": [{
      "tag": "button",
      "text": { "tag": "plain_text", "content": "打开排版打印" },
      "type": "primary",
      "url": "https://your-domain.com/print-plugin"
    }]
  }]
}
```

---

## 快速体验（本地开发）

不部署到飞书，直接本地使用：

```bash
npm install
npm run dev
```

浏览器访问 http://localhost:3000

---

## 常见问题

### Q: 如何获取飞书表格数据？
使用飞书开放 API 或多维表格 SDK

### Q: 如何实现飞书登录？
使用飞书 OAuth 2.0 授权

### Q: 导出的文件如何发送到飞书？
可通过飞书机器人 API 发送文件消息
