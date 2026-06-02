# SQL Playground

在浏览器 Worker 中运行真实 SQLite/WASM，支持先初始化表结构，再单独初始化或清除数据，之后在同一份临时数据库上连续执行查询、查看 Schema、样例数据和关系图。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 数据工具 |
| 运行环境 | WebAssembly + Worker |
| 标签 | sql、sqlite、playground、wasm |

## 能力

1. 最上方输入框用于编写 `CREATE TABLE`、`ALTER TABLE` 等数据库表结构脚本。
2. 中间输入框用于编写 `INSERT INTO`、`UPDATE` 等初始化数据内容，并支持单独“初始化数据”与“清除数据”。
3. 点击“初始化数据库表”后，Worker 内会保留当前临时数据库实例。
4. 最下方输入框可反复执行 `SELECT`、`JOIN`、`UPDATE`、`ALTER TABLE` 等语句，始终作用在当前数据库上。
5. 只有点击“重新初始化数据库表”或“清除数据库”时，当前数据库才会被重建或释放。
6. 结果区会统一刷新查询结果、Schema、样例数据和外键关系图。

## 目录结构

```
sql-playground/
├── manifest.ts        # 工具元声明
├── app.tsx     # 工具 UI 组件与 SQLite Worker 接入
├── package.json       # 包配置
└── README.md          # 本文档
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
