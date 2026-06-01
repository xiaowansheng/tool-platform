# Grade Weight Calculator

按作业、测验、期中和期末权重计算当前成绩，并估算达到目标分数所需的剩余成绩。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 计算工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | grade、weight、calculator、score、education |
| 权限 | clipboard |
| 能力 | weighted-average、target-score、remaining-weight |

## 目录结构

```
grade-weight-calculator/
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
