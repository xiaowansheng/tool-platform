# Tool Platform

[English](README.md) | [简体中文](README.zh-CN.md)

Tool Platform is a browser-first, plugin-oriented tool platform. It treats every tool as an independent plugin instead of a regular page: tools register through manifests and are then connected to shared category, search, dynamic route, and runtime management systems.

The repository is currently in Phase One. It already includes the Next.js web app, pnpm workspace, automatic tool manifest registration, dynamic tool pages, category/search surfaces, and foundational runtime packages. Future work can continue expanding Worker, WASM, AI, Sandbox, and large-file processing scenarios.

## Features

- Plugin-based tool directory: each tool lives in `tools/<tool-id>/` with `manifest.ts` and `ToolClient.tsx`.
- Automatic registration: `scripts/generate-tool-registry.mjs` scans tool directories and generates the tool registry.
- Dynamic routes: the web app loads tool clients through `/tools/[slug]`.
- Categories and search: tool manifests contribute `category`, `subCategory`, `tags`, and `description` metadata.
- Runtime foundation: shared contracts and runtime packages for simple, worker, wasm, ai, sandbox, and realtime tools.
- Browser SDK: shared helpers for clipboard, downloads, file opening, OPFS cache, toast feedback, runtime lifecycle, Worker, WASM, AI, and iframe sandbox capabilities.

## Tech Stack

- Monorepo: pnpm workspace + Turborepo
- Web app: Next.js 15 + React 19 + TypeScript
- Styling: Tailwind CSS 4
- Tool registry: Node.js scripts + TypeScript manifests
- Browser runtimes: Web Worker, WASM, OPFS, iframe sandbox, and local AI runtime foundations

## Quick Start

Use Node.js 20+ and pnpm 10.x. The repository pins `pnpm@10.28.1` in `package.json`.

```bash
corepack enable
pnpm install
pnpm dev
```

Then open:

```text
http://localhost:3000
```

`pnpm dev` runs `pnpm generate:tools` first, then starts workspace development tasks through Turborepo.

## Docker Compose

Production-style container run:

```bash
docker compose up --build
```

Development container with hot reload:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Both configurations publish container port `3000` to `${TOOL_PLATFORM_PORT:-3000}` on the host.

## Common Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Generate the tool registry and start development servers |
| `pnpm build` | Generate the tool registry and build all workspaces |
| `pnpm lint` | Generate the tool registry and run type/lint checks |
| `pnpm test` | Generate the tool registry and run tests |
| `pnpm generate:tools` | Scan `tools/*` and generate `packages/tool-sdk/src/generated/*` |
| `pnpm create-tool` | Create a new tool skeleton interactively or through flags |

Create a tool non-interactively:

```bash
pnpm create-tool json-diff --name "JSON Diff" --category 数据工具 --runtime simple
```

## Repository Structure

```text
tool-platform/
├── apps/
│   └── web/                  # Next.js web app, tool pages, category pages, search page
├── packages/
│   ├── tool-contracts/        # Shared ToolManifest, ToolRuntime, and related types
│   ├── tool-sdk/              # Tool registry, categories, search, and generated entry points
│   ├── tool-browser-sdk/      # Browser SDK for ToolClient implementations
│   ├── runtime/               # Tool lifecycle management
│   ├── worker-runtime/        # Worker RPC and worker runtime helpers
│   ├── wasm-runtime/          # WASM loading, preloading, and cache helpers
│   ├── ai-runtime/            # AI model provider/runtime abstractions
│   ├── sandbox-runtime/       # iframe sandbox document and client helpers
│   └── storage/               # OPFS file read/write capabilities
├── tools/
│   └── <tool-id>/             # Individual tool plugin
├── scripts/
│   ├── create-tool/           # Tool skeleton generator
│   └── generate-tool-registry.mjs
└── docs/                      # Architecture and UI/UX design documents
```

## Tool Loading Flow

```text
tools/<tool-id>/manifest.ts
  ↓ pnpm generate:tools
packages/tool-sdk/src/generated/manifests.ts
packages/tool-sdk/src/generated/client-loaders.ts
  ↓ apps/web
Home / category pages / search page /tools/[slug]
  ↓
ToolClient.tsx
  ↓
tool-browser-sdk + runtime packages
```

A tool only needs to provide its manifest and client component. The platform handles registration, navigation, search, dynamic import, and shared runtime capabilities.

## Tool Directory Convention

A standard tool directory usually contains:

```text
tools/json-formatter/
├── package.json
├── manifest.ts
├── ToolClient.tsx
└── README.md
```

`package.json` should expose the manifest and client component:

```json
{
  "exports": {
    "./manifest": "./manifest.ts",
    "./tool": "./ToolClient.tsx"
  }
}
```

`manifest.ts` describes tool metadata:

```ts
import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "Format, minify, and validate JSON text for developer workflows.",
  category: "数据工具",
  subCategory: "json",
  tags: ["json", "formatter", "validator"],
  icon: "braces",
  runtime: "simple",
  featured: true
};

export default manifest;
```

`ToolClient.tsx` is the actual tool UI. If it uses browser APIs, state, or interactions, declare it as a client component:

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

## Adding a Tool

1. Create a tool skeleton:

```bash
pnpm create-tool my-tool --name "My Tool" --category 开发工具 --runtime simple
```

2. Edit `tools/my-tool/manifest.ts` with accurate description, tags, icon, and runtime information.

3. Implement the input, processing, and output UI in `tools/my-tool/ToolClient.tsx`.

4. Regenerate the registry:

```bash
pnpm generate:tools
```

5. Start the dev server and open `/tools/my-tool` to verify the page.

## Categories and Runtimes

Tool categories are defined in `packages/tool-contracts/src/index.ts` and `packages/tool-sdk/src/categories.ts`:

```text
AI工具, 开发工具, 运维工具, 网络安全, 文件工具, 图片工具, 视频音频, 文本工具, 数据工具, 办公工具, 设计工具, SEO工具, 站长工具, 学习工具, 计算工具, 社媒工具, 电商工具, 效率工具, 娱乐工具, 导航发现
```

Supported runtime types:

```text
simple, worker, wasm, ai, sandbox, realtime
```

| Runtime | Use case |
| --- | --- |
| `simple` | Lightweight text, formatting, encoding, and calculation tools |
| `worker` | CPU-heavy, file parsing, or long-running work that should not block the main thread |
| `wasm` | Reusing high-performance Rust/C/C++ logic |
| `ai` | Local or remote model inference, embeddings, and streaming chat |
| `sandbox` | Isolated execution for untrusted HTML/script scenarios |
| `realtime` | WebSocket, streaming logs, real-time collaboration, or persistent sessions |

## Development Conventions

- Keep tool plugins independent; do not put tool-specific business logic in `apps/web`.
- Keep `manifest.id` aligned with the tool directory name.
- `description`, `tags`, and `subCategory` participate in search and should match terms users would search for.
- Prefer Worker, WASM, or dedicated runtime packages for heavy computation or large-file processing.
- Prefer OPFS capabilities exposed by `tool-browser-sdk` when temporary persistence is needed.
- Run `pnpm generate:tools` after adding, deleting, or renaming tools so generated files and `tool-sdk` dependencies stay in sync.

## Testing and Checks

Before submitting changes, run at least:

```bash
pnpm lint
pnpm test
```

For package-scoped checks, use pnpm filters:

```bash
pnpm --filter @tool-platform/runtime test
pnpm --filter @tool-platform/web lint
```

## Open Source

This repository is maintained as an open source project:

- [LICENSE](LICENSE): MIT license.
- [CONTRIBUTING.md](CONTRIBUTING.md): local development, adding tools, required checks, and PR expectations.
- [SECURITY.md](SECURITY.md): vulnerability disclosure, security scope, and sensitive data handling principles.
- [PRIVACY.md](PRIVACY.md): local-first data processing boundaries, browser permissions, and remote-call disclosure.
- [SUPPORT.md](SUPPORT.md): support expectations and security reporting entry points.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): community code of conduct.
- [CHANGELOG.md](CHANGELOG.md): change history.
- [ROADMAP.md](ROADMAP.md): project phases and future direction.

GitHub Actions runs generation, lint, test, and build checks on pushes and pull requests. Issue templates, the pull request template, and CODEOWNERS live under [.github](.github).

## Documentation

More design background:

- [Tool Platform architecture design](<docs/Tool Platform 架构设计文档.md>)
- [Tool Platform system architecture blueprint](<docs/Tool Platform 系统架构蓝图（System Architecture Blueprint）.md>)
- [UI/UX design system](<docs/UI UX 设计系统文档.md>)
