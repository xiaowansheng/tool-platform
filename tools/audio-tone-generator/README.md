# Audio Tone Generator

用 Web Audio 生成测试音、扫频和节拍，支持频率、波形、音量、时长与 WAV 下载。

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | 视频音频 |
| 运行环境 | 实时通信 |
| 标签 | audio、tone、wave、wav、metronome |
| 权限 | clipboard |
| 能力 | web-audio、tone-test、wav-export |

## 目录结构

```
audio-tone-generator/
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
