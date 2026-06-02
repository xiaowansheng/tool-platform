# Pomodoro Focus Timer

配置番茄钟、短休息和长休息节奏，记录完成轮次并生成可复制的专注计划。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 效率工具 |
| 运行环境 | 实时通信 |
| 标签 | pomodoro、timer、focus、productivity、notification |
| 权限 | notification、clipboard |
| 能力 | focus-cycle、session-log、notification-reminder |

## 目录结构

```
pomodoro-focus-timer/
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
