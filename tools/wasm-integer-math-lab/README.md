# WASM Integer Math Lab

实验整数运算的溢出、截断和位操作行为，可视化不同位宽下的计算结果。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 开发工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | wasm、integer、overflow、bitwise、math、u8、i32、i64 |

## 目录结构

```
wasm-integer-math-lab/
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
