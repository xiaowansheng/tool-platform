# Timestamp Converter

在 Unix 时间戳、ISO 字符串、RFC 2822 和本地时间之间双向换算。

## 功能

- **多格式输入**: 秒级/毫秒级/微秒级时间戳、ISO 8601、RFC 2822、日期选择器
- **时间戳输出**: Unix 秒、毫秒、纳秒
- **格式化时间**: ISO 8601、RFC 2822、UTC、本地时间
- **国际化**: 中文、美式、日本等多语言格式
- **时区转换**: 支持 18 个常见时区
- **日历组件**: 年、月、日、时、分、秒、星期、年第几天、年第几周
- **相对时间**: 自动计算「X 分钟前」「X 天后」等
- **一键复制**: 每个结果都支持复制到剪贴板

## 目录结构

```
timestamp-converter/
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
