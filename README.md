# 工具箱 Toolbox

基于 Vue 3 + Vite 的纯前端工具集合。首页是各工具的入口，所有计算都在浏览器本地完成，不上传任何数据。

## 功能

- JSON 格式化 / 压缩 / 校验 / 键名排序
- Base64 编解码（UTF-8、URL 安全字符）
- URL 编解码（`encodeURIComponent` / `encodeURI`）
- 时间戳 ↔ 日期互转（自动识别秒 / 毫秒，支持 UTC）
- HEX / RGB / HSL 颜色转换
- UUID v4 批量生成
- SHA-1 / SHA-256 / SHA-384 / SHA-512 摘要
- 随机密码生成（含强度评估）
- 文本统计（字符 / 单词 / 行数 / 汉字 / 字节）
- 深色与浅色主题、工具搜索

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 构建到 dist
npm run preview  # 预览构建产物
```

## 目录结构

```
src/
├── data/tools.js        # 工具清单（首页入口的唯一数据源）
├── router/index.js      # 路由，自动为每个工具生成页面
├── views/               # 首页、404
├── components/          # 卡片、工具页外壳
├── composables/         # useClipboard 等复用逻辑
├── tools/               # 每个工具一个 .vue 组件
└── styles/main.css      # 全局变量与基础样式
```

## 新增一个工具

1. 在 `src/tools/` 下新建组件，例如 `MyTool.vue`，用 `ToolLayout` 包裹内容：

```vue
<script setup>
import ToolLayout from '../components/ToolLayout.vue'
</script>

<template>
  <ToolLayout>
    <!-- 工具内容 -->
  </ToolLayout>
</template>
```

2. 在 `src/data/tools.js` 的 `tools` 数组里追加一项：

```js
{
  id: 'my-tool',          // 路由为 #/tools/my-tool
  name: '我的工具',
  file: 'MyTool',         // 对应 src/tools/MyTool.vue
  icon: '🧪',
  group: 'dev',           // codec | text | dev
  description: '一句话说明',
  tags: ['示例']
}
```

首页卡片与路由会自动生成，无需改动其他文件。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，把代码推送到 `main` 分支：

```bash
git init
git add .
git commit -m "feat: init toolbox"
git branch -M main
git remote add origin git@github.com:<你的用户名>/<仓库名>.git
git push -u origin main
```

2. 打开仓库 **Settings → Pages**，把 **Source** 设为 **GitHub Actions**。
3. 推送后 Actions 会自动构建并发布，地址为 `https://<用户名>.github.io/<仓库名>/`。

`vite.config.js` 使用 `base: './'` 且路由为 hash 模式，因此仓库名无需与配置一致，子路径部署、直接刷新任意工具页都不会 404。
