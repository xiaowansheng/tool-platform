# Sitemap XML Generator

根据 URL 列表生成标准 sitemap.xml 文件，支持设置优先级、更新频率和最后修改时间。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | SEO 工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | sitemap、xml、seo、url、crawler、search-engine |
| 权限 | clipboard |

## 目录结构

```
sitemap-xml-generator/
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
