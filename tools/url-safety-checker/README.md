# URL Safety Checker

解析 URL 并标记不安全协议、混淆、凭据、私网地址和可疑结构。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 网络安全 |
| 运行环境 | 轻量（主线程） |
| 标签 | url、phishing、security、network、domain |

## 目录结构

```
url-safety-checker/
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
