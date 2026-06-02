[English](README.md) | [简体中文](README.zh-CN.md)

# Tool Platform

Tool Platform 是一个面向浏览器的插件化工具平台。它把每个工具视为独立插件，而不是普通页面集合：工具通过 manifest 注册，进入统一的分类、搜索、动态路由和运行时管理体系。

当前仓库处于 Phase One：已经搭好 Next.js 主站、pnpm workspace、工具 manifest 自动注册、动态工具页面、分类搜索以及多运行时包的基础能力；后续可以继续扩展 Worker、WASM、AI、Sandbox 和大文件处理场景。

## 功能概览

- 插件化工具目录：每个工具独立放在 `tools/<tool-id>/`，包含 `manifest.ts` 和 `ToolClient.tsx`。
- 自动注册：`scripts/generate-tool-registry.mjs` 扫描工具目录并生成工具 registry。
- 动态路由：Web 应用通过 `/tools/[slug]` 加载对应工具客户端。
- 分类与搜索：基于工具 manifest 的 `category`、`subCategory`、`tags`、`description` 建立入口。
- 多运行时基础包：提供 simple、worker、wasm、ai、sandbox、realtime 等运行时类型的契约和基础封装。
- 浏览器能力 SDK：统一封装复制、下载、文件打开、OPFS 缓存、toast、runtime 生命周期、Worker、WASM、AI 和 iframe sandbox 能力。

## 技术栈

- Monorepo：pnpm workspace + Turborepo
- Web 应用：Next.js 15 + React 19 + TypeScript
- 样式：Tailwind CSS 4
- 工具注册：Node.js 脚本 + TypeScript manifest
- 浏览器运行时：Web Worker、WASM、OPFS、iframe sandbox、local AI runtime 基础封装

## 快速开始

建议使用 Node.js 20+，pnpm 10.x。仓库在 `package.json` 中固定了 `pnpm@10.28.1`。

```bash
corepack enable
pnpm install
pnpm dev
```

启动后访问：

```text
http://localhost:3000
```

`pnpm dev` 会先执行 `pnpm generate:tools`，再通过 Turborepo 并行启动各 workspace 的开发任务。

## Docker Compose

生产风格运行：

```bash
docker compose up --build
```

开发模式热更新运行：

```bash
docker compose -f docker-compose.dev.yml up --build
```

两套配置都会把容器 `3000` 端口发布到宿主机 `${TOOL_PLATFORM_PORT:-3000}`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 生成工具 registry，并启动开发服务 |
| `pnpm build` | 生成工具 registry，并构建所有 workspace |
| `pnpm lint` | 生成工具 registry，并执行类型检查/ lint 任务 |
| `pnpm test` | 生成工具 registry，并运行测试 |
| `pnpm generate:tools` | 扫描 `tools/*`，生成 `packages/tool-sdk/src/generated/*` |
| `pnpm create-tool` | 交互式创建新工具骨架 |

也可以用非交互参数创建工具：

```bash
pnpm create-tool json-diff --name "JSON Diff" --category 数据工具 --runtime simple
```

## 目录结构

```text
tool-platform/
├── apps/
│   └── web/                  # Next.js 主站、工具页面、分类页、搜索页
├── packages/
│   ├── tool-contracts/        # ToolManifest、ToolRuntime 等共享类型
│   ├── tool-sdk/              # 工具 registry、分类、搜索和生成入口
│   ├── tool-browser-sdk/      # 面向 ToolClient 的浏览器 SDK
│   ├── runtime/               # 工具生命周期管理
│   ├── worker-runtime/        # Worker RPC 和 Worker runtime 封装
│   ├── wasm-runtime/          # WASM 加载、预加载和缓存封装
│   ├── ai-runtime/            # AI model provider/runtime 抽象
│   ├── sandbox-runtime/       # iframe sandbox 文档与客户端
│   └── storage/               # OPFS 文件读写能力
├── tools/
│   └── <tool-id>/             # 单个工具插件
├── scripts/
│   ├── create-tool/           # 工具骨架生成脚本
│   └── generate-tool-registry.mjs
└── docs/                      # 架构和 UI/UX 设计文档
```

## 工具加载流程

```text
tools/<tool-id>/manifest.ts
  ↓ pnpm generate:tools
packages/tool-sdk/src/generated/manifests.ts
packages/tool-sdk/src/generated/client-loaders.ts
  ↓ apps/web
首页 / 分类页 / 搜索页 /tools/[slug]
  ↓
ToolClient.tsx
  ↓
tool-browser-sdk + runtime packages
```

工具只需要提供 manifest 和客户端组件，平台负责注册、导航、搜索、动态导入和基础运行时能力。

## 工具目录约定

一个标准工具目录通常包含：

```text
tools/json-formatter/
├── package.json
├── manifest.ts
├── ToolClient.tsx
└── README.md
```

`package.json` 需要暴露两个入口：

```json
{
  "exports": {
    "./manifest": "./manifest.ts",
    "./tool": "./ToolClient.tsx"
  }
}
```

`manifest.ts` 描述工具元数据：

```ts
import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "格式化、压缩并校验 JSON 文本，面向开发工作流。",
  category: "数据工具",
  subCategory: "json",
  tags: ["json", "formatter", "validator"],
  icon: "braces",
  runtime: "simple",
  featured: true
};

export default manifest;
```

`ToolClient.tsx` 是实际工具界面。需要浏览器 API、状态或交互时，应声明为客户端组件：

```tsx
"use client";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function JsonFormatterTool({ manifest }: ToolClientProps) {
  return (
    <section className="tool-panel">
      <h2>{manifest.name}</h2>
    </section>
  );
}
```

## 新增工具

1. 创建工具骨架：

```bash
pnpm create-tool my-tool --name "My Tool" --category 开发工具 --runtime simple
```

2. 修改 `tools/my-tool/manifest.ts`，补充准确的描述、标签、图标和运行时信息。

3. 在 `tools/my-tool/ToolClient.tsx` 中实现输入、处理和输出界面。

4. 重新生成 registry：

```bash
pnpm generate:tools
```

5. 启动开发服务并访问 `/tools/my-tool` 验证工具页面。

## 分类与运行时

支持的工具分类定义在 `packages/tool-contracts/src/index.ts` 和 `packages/tool-sdk/src/categories.ts`：

```text
AI工具, 开发工具, 运维工具, 网络安全, 文件工具, 图片工具, 视频音频, 文本工具, 数据工具, 办公工具, 设计工具, SEO工具, 站长工具, 学习工具, 计算工具, 社媒工具, 电商工具, 效率工具, 娱乐工具, 导航发现
```

支持的运行时类型：

```text
simple, worker, wasm, ai, sandbox, realtime
```

选择运行时的建议：

| Runtime | 适用场景 |
| --- | --- |
| `simple` | 轻量文本、格式化、编码、计算类工具 |
| `worker` | CPU 密集、文件解析、长任务，避免阻塞主线程 |
| `wasm` | 需要复用 Rust/C/C++ 等高性能逻辑 |
| `ai` | 本地或远程模型推理、embedding、流式对话 |
| `sandbox` | 需要隔离执行不可信 HTML/脚本的工具 |
| `realtime` | WebSocket、流式日志、实时协作或持续会话 |

## 开发约定

- 工具插件应保持独立依赖和独立 UI，不要把工具业务逻辑写进 `apps/web`。
- `manifest.id` 应与工具目录名保持一致，便于路由、搜索和调试。
- `description`、`tags`、`subCategory` 会参与搜索，应写成用户会搜索的词。
- 重计算或大文件处理优先放进 Worker、WASM 或专用 runtime。
- 需要持久化临时结果时优先使用 `tool-browser-sdk` 暴露的 OPFS 能力。
- 新增、删除或重命名工具后运行 `pnpm generate:tools`，确保生成文件和 `tool-sdk` 依赖同步。

## 测试与检查

提交前建议至少运行：

```bash
pnpm lint
pnpm test
```

如果只验证某个包，可以使用 pnpm filter，例如：

```bash
pnpm --filter @tool-platform/runtime test
pnpm --filter @tool-platform/web lint
```

## 开源协作

这个仓库按开源项目维护，相关入口如下：

- [LICENSE](LICENSE)：MIT 许可证。
- [CONTRIBUTING.md](CONTRIBUTING.md)：本地开发、新增工具、提交前检查和 PR 要求。
- [SECURITY.md](SECURITY.md)：漏洞披露、安全范围和敏感数据处理原则。
- [PRIVACY.md](PRIVACY.md)：本地优先的数据处理边界、浏览器权限和远程调用说明。
- [SUPPORT.md](SUPPORT.md)：问题反馈、支持范围和安全问题入口。
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)：社区行为准则。
- [CHANGELOG.md](CHANGELOG.md)：变更记录。
- [ROADMAP.md](ROADMAP.md)：阶段目标和后续计划。

GitHub Actions 会在 push 和 pull request 上运行生成、lint、test 和 build 检查。Issue 模板、PR 模板和 CODEOWNERS 位于 [.github](.github)。

## 文档

更多设计背景见：

- [Tool Platform 架构设计文档](<docs/Tool Platform 架构设计文档.md>)
- [Tool Platform 系统架构蓝图](<docs/Tool Platform 系统架构蓝图（System Architecture Blueprint）.md>)
- [UI UX 设计系统文档](<docs/UI UX 设计系统文档.md>)
