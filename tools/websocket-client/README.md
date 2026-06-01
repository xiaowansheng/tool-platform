# WebSocket Client

连接 ws/wss 端点、发送消息并查看事件日志的 WebSocket 调试客户端。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 站长工具 |
| 运行环境 | 实时通信 |
| 标签 | websocket、ws、realtime、debug、network |
| 能力 | websocket |

## 目录结构

```
websocket-client/
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
