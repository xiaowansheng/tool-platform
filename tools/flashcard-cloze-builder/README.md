# Flashcard Cloze Builder

从学习笔记生成问答卡、填空卡和 Anki TSV，支持关键词标记、难度和复习提示。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 学习工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | flashcard、anki、cloze、study、learning |
| 权限 | clipboard |
| 能力 | flashcard-generate、cloze-deletion、anki-tsv |

## 目录结构

```
flashcard-cloze-builder/
├── manifest.ts        # 工具元声明
├── ToolClient.tsx     # 工具 UI 组件
├── package.json      # 包配置
└── README.md         # 本文档
```

## 开发指引

1. 确保已安装依赖：`pnpm install`
2. 修改 `ToolClient.tsx` 实现工具功能
3. 运行 `pnpm generate:tools` 重新生成工具注册表
4. 启动开发服务器：`pnpm dev`

## 构建与发布

```bash
pnpm build        # 构建所有包
pnpm lint         # 代码检查
pnpm test         # 运行测试
```
