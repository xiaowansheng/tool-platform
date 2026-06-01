# AI Chat

浏览器内 AI Chat 工作台，支持 system prompt、流式输出、会话记录和本地 token 估算。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | AI 工具 |
| 运行环境 | AI 推理 |
| 标签 | ai、chat、prompt、streaming、local |
| 权限 | clipboard |
| 能力 | streaming-chat、prompt-workbench、local-simulation |

## 目录结构

```
ai-chat/
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
