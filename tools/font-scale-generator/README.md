# Font Scale Generator

基于基础字号和比例生成排版 scale、CSS token 和预览样张。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 设计工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | typography、font scale、type scale、css tokens、design system |
| 权限 | clipboard |

## 目录结构

```
font-scale-generator/
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
