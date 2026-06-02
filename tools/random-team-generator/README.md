# Random Team Generator

把名单随机分队，支持种子、队伍数量、每队人数和避开同组约束，适合活动和课堂分组。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 娱乐工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | random、team、group、seed、activity |
| 权限 | clipboard |
| 能力 | seeded-random、team-balance、copyable-groups |

## 目录结构

```
random-team-generator/
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
