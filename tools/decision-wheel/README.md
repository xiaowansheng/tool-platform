# Decision Wheel

输入候选项和可选权重，用可复现 seed 随机抽取结果并保留选择历史。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 娱乐工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | random、decision、wheel、picker、seed |
| 权限 | clipboard |
| 能力 | weighted-random、seeded-result、history-copy |

## 目录结构

```
decision-wheel/
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
