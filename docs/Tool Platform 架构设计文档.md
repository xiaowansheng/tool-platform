# 前端工具站 / Tool Platform 架构设计文档

## 1. 项目目标

打造一个：

* 可扩展
* 插件化
* 多运行时
* 支持 WebAssembly
* 支持 AI 工具
* 支持大型文件处理
* 支持未来微前端/插件市场

的现代化浏览器工具平台（Tool Platform）。

该平台不仅是“工具页面集合”，而是一个：

# 浏览器中的应用运行平台（Tool OS）

---

# 2. 核心设计思想

## 2.1 工具不是页面

工具本质应该是：

* 独立模块
* 独立运行时
* 独立依赖
* 独立生命周期
* 独立权限
* 独立资源管理

因此：

# 工具 = 插件（Plugin）

而不是普通 React 页面。

---

## 2.2 平台与工具解耦

平台负责：

* 导航
* 搜索
* 分类
* SEO
* 用户系统
* 权限系统
* Tool SDK
* Runtime 管理
* Analytics

工具负责：

* 自身功能
* 自身 UI
* 自身 Worker
* 自身 WASM
* 自身 Runtime

---

# 3. 总体架构

```text
用户
  ↓
主站（Next.js）
  ↓
Tool Runtime Layer
  ↓
Tool Sandbox
  ↓
Worker Runtime
  ↓
WASM / AI Runtime
```

---

# 4. 技术栈推荐

## 4.1 前端主站

推荐：

```text
Next.js 15
React 19
TypeScript
Tailwind CSS
shadcn/ui
Framer Motion
```

---

## 4.2 Monorepo

推荐：

```text
pnpm
Turborepo
```

---

## 4.3 状态管理

推荐：

```text
Zustand
TanStack Query
```

避免全局 Redux。

---

## 4.4 WebAssembly

推荐：

```text
Rust
wasm-pack
wasm-bindgen
```

---

## 4.5 Worker 通信

推荐：

```text
Comlink
```

或者自定义 RPC。

---

## 4.6 AI Runtime

推荐：

```text
Transformers.js
ONNX Runtime Web
WebGPU
```

---

# 5. Monorepo 目录结构

推荐结构：

```text
tool-platform/
│
├── apps/
│   ├── web/
│   ├── docs/
│   └── admin/
│
├── tools/
│   ├── json-formatter/
│   ├── regex-tester/
│   ├── ffmpeg-editor/
│   ├── image-compressor/
│   └── ai-chat/
│
├── packages/
│   ├── ui/
│   ├── tool-sdk/
│   ├── runtime/
│   ├── worker-runtime/
│   ├── wasm-runtime/
│   ├── analytics/
│   ├── auth/
│   ├── storage/
│   └── config/
│
├── scripts/
│   └── create-tool/
│
└── infra/
```

---

# 6. 工具分类体系

## 6.1 推荐分类

```text
AI工具
开发工具
运维工具
网络安全
文件工具
图片工具
视频音频
文本工具
数据工具
办公工具
设计工具
SEO工具
站长工具
学习工具
计算工具
社媒工具
电商工具
效率工具
娱乐工具
导航发现
```

---

## 6.2 推荐标签结构

```ts
category
subCategory
tags
```

避免无限层级。

---

# 7. 工具类型体系

## 7.1 simple

轻量工具：

```text
UUID
JSON
Base64
Regex
```

推荐架构：

```text
React Component
```

---

## 7.2 worker

中型工具：

```text
PDF
SQLite
Markdown
```

推荐架构：

```text
React
+
Worker
```

---

## 7.3 wasm

大型 WASM 工具：

```text
ffmpeg
opencv
OCR
```

推荐架构：

```text
Worker
+
WASM
+
Sandbox
```

---

## 7.4 ai

AI 推理工具：

```text
Whisper
LLM
OCR
Embedding
```

推荐架构：

```text
AI Runtime
+
Worker
+
Model Loader
```

---

## 7.5 sandbox

在线 IDE / Playground：

```text
Python Playground
SQL Playground
Docker Playground
```

推荐架构：

```text
iframe
+
Worker
+
Sandbox Runtime
```

---

## 7.6 realtime

实时协作工具：

```text
协同白板
多人 IDE
```

推荐架构：

```text
RTC
+
CRDT
```

---

# 8. Tool Manifest 设计

## 8.1 基础 Manifest

```ts
import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "JSON 格式化工具",
  category: "data-tools",
  tags: ["json", "formatter"],
  icon: "braces",
  featured: true,
  runtime: "simple"
};

export default manifest;
```

---

## 8.2 高级 Manifest

```ts
export default {
  id: "ffmpeg-editor",

  name: "FFmpeg Editor",

  runtime: "wasm",

  isolation: "worker",

  sandbox: true,

  permissions: [
    "filesystem"
  ],

  capabilities: [
    "video",
    "stream"
  ],

  preload: [
    "ffmpeg-core.wasm"
  ],

  memoryLimit: 1024,

  worker: true,

  ai: false
}
```

---

# 9. 工具自动注册系统

## 9.1 自动发现工具

扫描：

```text
tools/*/manifest.ts
```

自动生成：

* Tool Registry
* 分类页
* 搜索索引
* Sitemap
* SEO
* 导航

---

## 9.2 动态路由

推荐：

```text
/tools/[slug]
```

例如：

```text
/tools/json-formatter
/tools/ffmpeg-editor
```

---

# 10. Tool Runtime 设计

## 10.1 Runtime 类型

```ts
export type ToolRuntime =
  | "simple"
  | "worker"
  | "wasm"
  | "ai"
  | "sandbox"
  | "realtime"
```

---

## 10.2 Runtime 生命周期

```ts
init()
mount()
suspend()
resume()
destroy()
```

---

## 10.3 Runtime 管理器

负责：

* Worker 生命周期
* 内存管理
* 资源回收
* Runtime 缓存
* Sandbox 隔离

---

# 11. Worker Runtime 设计

## 11.1 推荐结构

```text
UI Layer
↕
Worker RPC
↕
Worker Runtime
↕
WASM Runtime
```

---

## 11.2 RPC 推荐结构

请求：

```ts
{
  id: string,
  action: string,
  payload: unknown
}
```

返回：

```ts
{
  id: string,
  success: boolean,
  data?: unknown,
  error?: string
}
```

---

## 11.3 推荐封装

```ts
await worker.call(
  "compress",
  payload
)
```

---

# 12. WebAssembly 架构设计

## 12.1 推荐目录

```text
ffmpeg-editor/
├── ui/
├── worker/
├── wasm/
├── core/
└── manifest.ts
```

---

## 12.2 WASM Loader

统一：

```ts
loadWasm()
```

负责：

* Streaming Compile
* Cache
* Preload
* Lazy Load
* Memory 管理

---

## 12.3 WASM 缓存

推荐：

```text
Cache Storage
+
IndexedDB
```

---

# 13. AI Runtime 设计

## 13.1 AI Runtime 分层

```text
UI
↓
AI Runtime
↓
Model Loader
↓
ONNX/WebGPU
```

---

## 13.2 模型管理

模型与工具分离：

```text
models/
tools/
```

---

## 13.3 AI 能力推荐

建议支持：

```text
stream
embedding
chat
ocr
transcribe
vision
```

---

# 14. Sandbox 架构

## 14.1 推荐场景

适用于：

```text
ffmpeg
在线 IDE
AI 推理
Docker Playground
```

---

## 14.2 Sandbox 结构

```text
主站
↓ iframe
独立 Tool App
↓
Worker
↓
WASM Runtime
```

---

## 14.3 Sandbox 目标

实现：

* 样式隔离
* 内存隔离
* 崩溃隔离
* Worker 隔离
* 权限隔离

---

# 15. 文件系统设计

## 15.1 推荐 OPFS

即：

```text
Origin Private File System
```

用于：

* 视频处理
* PDF
* SQLite
* AI 模型缓存

---

## 15.2 文件处理架构

```text
Worker
+
OPFS
+
Stream
```

---

# 16. Tool SDK 设计

## 16.1 基础能力

```ts
copy()
download()
share()
toast()
openFile()
saveFile()
```

---

## 16.2 Runtime API

```ts
openTool()
closeTool()
restartTool()
```

---

## 16.3 Worker API

```ts
call()
stream()
cancel()
```

---

# 17. 权限系统设计

## 17.1 推荐权限

```text
clipboard
filesystem
camera
microphone
webgpu
notification
```

---

## 17.2 Manifest 权限声明

```ts
permissions: [
  "filesystem",
  "webgpu"
]
```

---

# 18. 搜索系统设计

## 18.1 初期方案

使用：

```text
Fuse.js
```

搜索：

* name
* description
* tags
* keywords

---

## 18.2 后期方案

推荐：

```text
Meilisearch
Algolia
```

---

# 19. SEO 架构

## 19.1 自动生成

根据 Manifest 自动生成：

* title
* meta
* sitemap
* structured data

---

## 19.2 Tool SEO 页面

推荐包含：

* 工具说明
* 示例
* FAQ
* 使用教程
* 相关推荐

---

# 20. Analytics 设计

## 20.1 推荐统计

```text
工具使用量
搜索关键词
热门工具
错误日志
性能数据
```

---

## 20.2 推荐工具

```text
PostHog
Plausible
Umami
```

---

# 21. 部署架构

## 21.1 主站

推荐：

* Vercel
* Cloudflare

---

## 21.2 重工具

独立部署：

```text
AI Runtime
FFmpeg Service
OCR Service
```

---

# 22. create-tool CLI

## 22.1 推荐命令

本地工具：

```bash
pnpm create-tool my-tool --name "My Tool" --category developer-tools --runtime simple
```

远程 iframe 工具：

```bash
pnpm create-tool vendor-tool --name "Vendor Tool" --category developer-tools --runtime remote --remote-url https://tools.example.com/app
```

---

## 22.2 自动生成

本地工具自动创建：

```text
manifest.ts
app.tsx
package.json
README.md
```

远程 iframe 工具自动创建：

```text
manifest.ts
package.json
README.md
```

---

# 23. 工具生命周期

完整生命周期：

```text
创建工具
→ 自动注册
→ 自动生成路由
→ 自动加入搜索
→ 自动加入分类
→ 自动生成 SEO
→ 自动部署
```

---

# 24. 推荐开发阶段

## 第一阶段

先完成：

```text
平台骨架
Manifest
动态路由
分类系统
搜索系统
simple 工具
```

---

## 第二阶段

增加：

```text
Worker Runtime
WASM Runtime
OPFS
Tool SDK
```

---

## 第三阶段

增加：

```text
AI Runtime
Sandbox
iframe 隔离
```

---

## 第四阶段

增加：

```text
插件市场
远程工具
多用户协作
Tool Workflow
```

---

# 25. 最终目标

最终得到的不是：

```text
工具页面集合
```

而是：

# 浏览器应用平台（Tool Platform）

甚至：

# Web Tool OS

具备：

* 插件化
* Runtime
* Worker
* WASM
* AI
* Sandbox
* 文件系统
* 多工具协同
* Workflow

等现代浏览器应用平台能力。
