[English](README.md) | [简体中文](README.zh-CN.md)

# Tool Platform

Tool Platform 是一个面向浏览器的插件化工具平台。它把每个工具视为独立微前端插件，而不是普通页面集合：工具通过 manifest 注册，进入统一的分类、搜索、动态路由和运行时管理体系。

当前仓库处于 Phase One：已经搭好 Next.js 主站、pnpm workspace、manifest 驱动的工具自动注册、动态工具页面、分类入口、首页搜索以及本地/远程工具运行的基础能力。

## 功能概览

- Manifest 驱动的微前端工具目录：本地工具提供 `manifest.ts` + `app.tsx`；远程 iframe 工具只提供 `manifest.ts`。
- 自动注册：`scripts/generate-tool-registry.mjs` 扫描 `tools/*`，为所有工具生成 manifest 注册表，只为本地工具生成 client loader。
- 动态路由：Web 应用通过 `/tools/[slug]` 及其可选子路径（如 `/tools/[slug]/schema`）加载对应工具应用。
- 分类与搜索：基于工具 manifest 的 `category`、`subCategory`、`tags`、`description` 建立入口。
- 多运行时基础包：提供 simple、worker、wasm、ai、sandbox、remote、realtime 等运行时类型的契约和基础封装。
- 浏览器能力 SDK：统一封装复制、下载、文件打开、OPFS 缓存、toast、runtime 生命周期、Worker、WASM、AI 和 iframe sandbox 能力。

## 技术栈

- Monorepo：pnpm workspace + Turborepo
- Web 应用：Next.js 15 + React 19 + TypeScript
- 样式：Tailwind CSS 4
- 工具注册：Node.js 脚本 + TypeScript manifest
- 浏览器运行时：Web Worker、WASM、OPFS、iframe sandbox、远程 iframe 微前端、local AI runtime 基础封装

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
| `pnpm create-tool` | 交互式或通过参数创建本地/远程工具骨架 |

非交互方式创建本地工具：

```bash
pnpm create-tool json-diff --name "JSON Diff" --category data-tools --runtime simple
```

非交互方式创建远程 iframe 工具：

```bash
pnpm create-tool vendor-tool --name "Vendor Tool" --category developer-tools --runtime remote --remote-url https://tools.example.com/app
```

## 目录结构

```text
tool-platform/
|-- apps/
|   `-- web/                  # Next.js 主站、首页搜索、工具页面和分类页
|-- packages/
|   |-- tool-contracts/        # ToolManifest、ToolRuntime 等共享类型
|   |-- tool-sdk/              # 工具 registry、分类、搜索、微前端 adapter 和生成入口
|   |-- tool-browser-sdk/      # 面向工具 app 实现的浏览器 SDK
|   |-- runtime/               # 工具生命周期管理
|   |-- worker-runtime/        # Worker RPC 和 Worker runtime 封装
|   |-- wasm-runtime/          # WASM 加载、预加载和缓存封装
|   |-- ai-runtime/            # AI model provider/runtime 抽象
|   |-- sandbox-runtime/       # iframe sandbox 文档与客户端
|   `-- storage/               # OPFS 文件读写能力
|-- tools/
|   `-- <tool-id>/             # 单个本地或远程工具插件
|-- scripts/
|   |-- create-tool/           # 工具骨架生成脚本
|   `-- generate-tool-registry.mjs
`-- docs/                      # 架构和 UI/UX 设计文档
```

## 工具加载流程

```text
tools/<tool-id>/manifest.ts
  | pnpm generate:tools
  v
packages/tool-sdk/src/generated/manifests.ts
packages/tool-sdk/src/generated/client-loaders.ts  # 仅本地工具
  | apps/web
  v
首页（发现 + 搜索） / 分类页 /tools/[slug]/[[...segments]]
  |
  v
ToolMicroFrontendHost
  |-- local adapter -> app.tsx 动态导入
  `-- iframe adapter -> 远程微前端 URL
```

`ToolMicroFrontendHost` 是工具页面唯一的 host 接口。本地工具解析为 generated dynamic import；远程工具从 `manifest.microFrontend` 解析，并通过 iframe 渲染。host 会把 `toolId`、`locale`、`path`、`segments` 作为查询参数传给远程端。

旧的 `/{locale}/search` 路由仍然保留，但只作为兼容跳转入口，会把搜索词转发到首页搜索状态 `?q=...#search`。

## 工具目录约定

本地工具包包含 manifest 和客户端组件：

```text
tools/json-formatter/
|-- package.json
|-- manifest.ts
|-- app.tsx
`-- README.md
```

远程 iframe 工具包只包含 manifest：

```text
tools/remote-iframe-demo/
|-- package.json
|-- manifest.ts
`-- README.md
```

本地 `package.json` 需要导出 manifest 和 app：

```json
{
  "exports": {
    "./manifest": "./manifest.ts",
    "./app": "./app.tsx"
  }
}
```

远程 `package.json` 只导出 manifest：

```json
{
  "exports": {
    "./manifest": "./manifest.ts"
  }
}
```

本地工具 manifest 示例：

```ts
import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "格式化、压缩并校验 JSON 文本，面向开发工作流。",
  category: "data-tools",
  subCategory: "json",
  tags: ["json", "formatter", "validator"],
  icon: "braces",
  runtime: "simple",
  featured: true
};

export default manifest;
```

远程 iframe manifest 示例：

```ts
import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "vendor-tool",
  name: "Vendor Tool",
  description: "供应商托管的 iframe 微前端。",
  category: "developer-tools",
  tags: ["remote", "iframe"],
  icon: "panel-top",
  runtime: "remote",
  isolation: "iframe",
  sandbox: true,
  microFrontend: {
    kind: "iframe",
    url: "https://tools.example.com/app",
    title: "Vendor Tool"
  }
};

export default manifest;
```

`app.tsx` 只对本地工具必需。单页工具可以直接在这里渲染，多页工具可以根据 `segments` 切换内部页面；如果需要浏览器 API、状态或交互，则应声明为客户端组件：

```tsx
"use client";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function JsonFormatterTool({ manifest }: ToolAppProps) {
  return (
    <section className="tool-panel">
      <h2>{manifest.name}</h2>
    </section>
  );
}
```

## 新增工具

1. 创建本地工具骨架：

```bash
pnpm create-tool my-tool --name "My Tool" --category developer-tools --runtime simple
```

2. 或创建远程 iframe 工具骨架：

```bash
pnpm create-tool vendor-tool --name "Vendor Tool" --category developer-tools --runtime remote --remote-url https://tools.example.com/app
```

3. 修改 `tools/<tool-id>/manifest.ts`，补充准确的描述、标签、图标、运行时和微前端信息。

4. 本地工具在 `tools/<tool-id>/app.tsx` 中实现输入、处理和输出界面；远程工具没有 `app.tsx`。

5. 重新生成 registry：

```bash
pnpm generate:tools
```

6. 启动开发服务并访问 `/tools/<tool-id>` 验证工具页面。

## 分类与运行时

工具分类定义在 `packages/tool-contracts/src/index.ts` 和 `packages/tool-sdk/src/categories.ts`。Manifest 的 `category` 必须使用这些 ID：

```text
ai-tools, developer-tools, ops-tools, security-tools, file-tools, image-tools, media-tools, text-tools, data-tools, office-tools, design-tools, seo-tools, webmaster-tools, learning-tools, calculator-tools, social-tools, ecommerce-tools, productivity-tools, entertainment-tools, discovery-tools
```

支持的运行时类型：

```text
simple, worker, wasm, ai, sandbox, remote, realtime
```

选择运行时的建议：

| Runtime | 适用场景 |
| --- | --- |
| `simple` | 轻量文本、格式化、编码、计算类工具 |
| `worker` | CPU 密集、文件解析、长任务，避免阻塞主线程 |
| `wasm` | 需要复用 Rust/C/C++ 等高性能逻辑 |
| `ai` | 本地或远程模型推理、embedding、流式对话 |
| `sandbox` | 需要隔离执行不可信 HTML/脚本的工具 |
| `remote` | 工具包外部托管的 manifest-only iframe 微前端 |
| `realtime` | WebSocket、流式日志、实时协作或持续会话 |

## 开发约定

- 工具插件应保持独立依赖和独立 UI，不要把工具业务逻辑写进 `apps/web`。
- `manifest.id` 应与工具目录名保持一致，便于路由、搜索和调试。
- 本地工具必须导出 `./manifest` 和 `./app`；远程 iframe 工具只导出 `./manifest`。
- 远程 iframe 工具必须设置 `runtime: "remote"` 和 `microFrontend.kind: "iframe"`。
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
