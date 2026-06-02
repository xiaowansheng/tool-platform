# DB Connection String Workbench

解析和重建 PostgreSQL、MySQL、Redis 连接串，输出脱敏摘要、环境变量和客户端命令。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 数据工具 |
| 运行环境 | 轻量（主线程） |
| 标签 | database、postgres、mysql、redis、url、dsn |
| 权限 | clipboard |
| 能力 | dsn-parse、secret-masking、env-snippets |

## 目录结构

```
db-connection-string-workbench/
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
