# Tool Platform

[English](README.md) | [简体中文](README.zh-CN.md)

Tool Platform is a browser-first, plugin-oriented tool platform. It treats every tool as an independent micro frontend plugin instead of a regular page: tools register through manifests and are connected to shared category, search, dynamic route, and runtime management systems.

The repository is currently in Phase One. It includes the Next.js web app, pnpm workspace, manifest-driven tool registration, dynamic tool pages, category/search surfaces, and runtime packages for local and remote tool execution.

## Features

- Manifest-driven micro frontend directory: local tools provide `manifest.ts` + `app.tsx`; remote iframe tools provide `manifest.ts` only.
- Automatic registration: `scripts/generate-tool-registry.mjs` scans `tools/*`, generates manifests for every tool, and generates client loaders only for local tools.
- Dynamic routes: the web app loads tool apps through `/tools/[slug]` and optional nested subpaths such as `/tools/[slug]/schema`.
- Categories and search: tool manifests contribute `category`, `subCategory`, `tags`, and `description` metadata.
- Runtime foundation: shared contracts and runtime packages for simple, worker, wasm, ai, sandbox, remote, and realtime tools.
- Browser SDK: shared helpers for clipboard, downloads, file opening, OPFS cache, toast feedback, runtime lifecycle, Worker, WASM, AI, and iframe sandbox capabilities.

## Tech Stack

- Monorepo: pnpm workspace + Turborepo
- Web app: Next.js 15 + React 19 + TypeScript
- Styling: Tailwind CSS 4
- Tool registry: Node.js scripts + TypeScript manifests
- Browser runtimes: Web Worker, WASM, OPFS, iframe sandbox, remote iframe micro frontends, and local AI runtime foundations

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
| `pnpm create-tool` | Create a local or remote tool skeleton interactively or through flags |

Create a local tool non-interactively:

```bash
pnpm create-tool json-diff --name "JSON Diff" --category data-tools --runtime simple
```

Create a remote iframe tool non-interactively:

```bash
pnpm create-tool vendor-tool --name "Vendor Tool" --category developer-tools --runtime remote --remote-url https://tools.example.com/app
```

## Repository Structure

```text
tool-platform/
|-- apps/
|   `-- web/                  # Next.js web app, tool pages, category pages, search page
|-- packages/
|   |-- tool-contracts/        # Shared ToolManifest, ToolRuntime, and related types
|   |-- tool-sdk/              # Tool registry, categories, search, micro frontend adapters, generated entry points
|   |-- tool-browser-sdk/      # Browser SDK for tool app implementations
|   |-- runtime/               # Tool lifecycle management
|   |-- worker-runtime/        # Worker RPC and worker runtime helpers
|   |-- wasm-runtime/          # WASM loading, preloading, and cache helpers
|   |-- ai-runtime/            # AI model provider/runtime abstractions
|   |-- sandbox-runtime/       # iframe sandbox document and client helpers
|   `-- storage/               # OPFS file read/write capabilities
|-- tools/
|   `-- <tool-id>/             # Individual local or remote tool plugin
|-- scripts/
|   |-- create-tool/           # Tool skeleton generator
|   `-- generate-tool-registry.mjs
`-- docs/                      # Architecture and UI/UX design documents
```

## Tool Loading Flow

```text
tools/<tool-id>/manifest.ts
  | pnpm generate:tools
  v
packages/tool-sdk/src/generated/manifests.ts
packages/tool-sdk/src/generated/client-loaders.ts  # local tools only
  | apps/web
  v
Home / category pages / search page /tools/[slug]/[[...segments]]
  |
  v
ToolMicroFrontendHost
  |-- local adapter -> app.tsx dynamic import
  `-- iframe adapter -> remote micro frontend URL
```

`ToolMicroFrontendHost` is the single host interface used by tool pages. Local tools resolve to generated dynamic imports. Remote tools resolve from `manifest.microFrontend` and are rendered in an iframe with host context query parameters: `toolId`, `locale`, `path`, and `segments`.

## Tool Directory Convention

A local tool package contains a manifest and a client component:

```text
tools/json-formatter/
|-- package.json
|-- manifest.ts
|-- app.tsx
`-- README.md
```

A remote iframe tool package is manifest-only:

```text
tools/remote-iframe-demo/
|-- package.json
|-- manifest.ts
`-- README.md
```

Local `package.json` exports both manifest and app:

```json
{
  "exports": {
    "./manifest": "./manifest.ts",
    "./app": "./app.tsx"
  }
}
```

Remote `package.json` exports only the manifest:

```json
{
  "exports": {
    "./manifest": "./manifest.ts"
  }
}
```

Local manifest example:

```ts
import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "Format, minify, and validate JSON text for developer workflows.",
  category: "data-tools",
  subCategory: "json",
  tags: ["json", "formatter", "validator"],
  icon: "braces",
  runtime: "simple",
  featured: true
};

export default manifest;
```

Remote iframe manifest example:

```ts
import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "vendor-tool",
  name: "Vendor Tool",
  description: "A vendor-hosted iframe micro frontend.",
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

`app.tsx` is required only for local tools. Single-page tools can render directly there; multi-page tools can branch on `segments`. If it uses browser APIs, state, or interactions, declare it as a client component:

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

## Adding a Tool

1. Create a local tool skeleton:

```bash
pnpm create-tool my-tool --name "My Tool" --category developer-tools --runtime simple
```

2. Or create a remote iframe tool skeleton:

```bash
pnpm create-tool vendor-tool --name "Vendor Tool" --category developer-tools --runtime remote --remote-url https://tools.example.com/app
```

3. Edit `tools/<tool-id>/manifest.ts` with accurate description, tags, icon, runtime, and micro frontend information.

4. For local tools, implement the input, processing, and output UI in `tools/<tool-id>/app.tsx`. Remote tools do not have `app.tsx`.

5. Regenerate the registry:

```bash
pnpm generate:tools
```

6. Start the dev server and open `/tools/<tool-id>` to verify the page.

## Categories and Runtimes

Tool categories are defined in `packages/tool-contracts/src/index.ts` and `packages/tool-sdk/src/categories.ts`. Manifest `category` values must use these IDs:

```text
ai-tools, developer-tools, ops-tools, security-tools, file-tools, image-tools, media-tools, text-tools, data-tools, office-tools, design-tools, seo-tools, webmaster-tools, learning-tools, calculator-tools, social-tools, ecommerce-tools, productivity-tools, entertainment-tools, discovery-tools
```

Supported runtime types:

```text
simple, worker, wasm, ai, sandbox, remote, realtime
```

| Runtime | Use case |
| --- | --- |
| `simple` | Lightweight text, formatting, encoding, and calculation tools |
| `worker` | CPU-heavy, file parsing, or long-running work that should not block the main thread |
| `wasm` | Reusing high-performance Rust/C/C++ logic |
| `ai` | Local or remote model inference, embeddings, and streaming chat |
| `sandbox` | Isolated execution for untrusted HTML/script scenarios |
| `remote` | Manifest-only iframe micro frontends hosted outside the local tool package |
| `realtime` | WebSocket, streaming logs, real-time collaboration, or persistent sessions |

## Development Conventions

- Keep tool plugins independent; do not put tool-specific business logic in `apps/web`.
- Keep `manifest.id` aligned with the tool directory name.
- Local tools must export `./manifest` and `./app`; remote iframe tools must export only `./manifest`.
- Remote iframe tools must set `runtime: "remote"` and `microFrontend.kind: "iframe"`.
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
