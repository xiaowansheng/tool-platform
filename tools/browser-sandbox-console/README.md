# Browser Sandbox Console

在隔离 iframe 中运行 HTML/CSS/JS 片段，捕获 console 输出并生成可复制的 srcdoc。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 开发工具 |
| 运行环境 | 沙箱隔离 |
| 标签 | sandbox、iframe、html、css、javascript、console |
| 权限 | clipboard |
| 能力 | iframe-sandbox、console-capture、srcdoc-preview |

## 目录结构

```
browser-sandbox-console/
├── manifest.ts        # 工具元声明
├── app.tsx     # 工具 UI 组件
├── package.json      # 包配置
└── README.md         # 本文档
```

## 开发指引

1. 确保已安装依赖：`pnpm install`
2. 修改 `app.tsx` 实现工具功能
3. 运行 `pnpm generate:tools` 重新生成工具注册表
4. 启动开发服务器：`pnpm dev`

## 构建与发布

```bash
pnpm build        # 构建所有包
pnpm lint         # 代码检查
pnpm test         # 运行测试
```
