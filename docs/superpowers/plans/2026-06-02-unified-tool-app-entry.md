# Unified Tool `app.tsx` Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-page `ToolClient.tsx` plugin contract with a unified `app.tsx` entry that supports both single-page and multi-page tools while preserving existing tool discovery, routing, workspace tabs, and search behavior during migration.

**Architecture:** The platform will move from `./tool -> ToolClient.tsx` to `./app -> app.tsx`, and route tools through `/tools/[slug]/[[...segments]]`. During migration, the loader and registry will support both contracts so existing tools keep working. Workspace tabs will remain tool-scoped, not subpage-scoped, by normalizing any `/tools/<id>/...` path back to `/tools/<id>` for tab identity.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, pnpm workspace, generated tool registry script.

---

## File Map

**Create**
- `docs/superpowers/plans/2026-06-02-unified-tool-app-entry.md`
- `apps/web/app/[locale]/tools/[slug]/[[...segments]]/page.tsx`
- `apps/web/components/tool-app-loader.tsx`

**Modify**
- `packages/tool-contracts/src/index.ts`
- `packages/tool-sdk/src/types.ts`
- `packages/tool-sdk/src/client.ts`
- `packages/tool-sdk/src/generated/client-loaders.ts`
- `scripts/generate-tool-registry.mjs`
- `apps/web/components/platform-shell.tsx`
- `apps/web/components/workspace-tabs.tsx`
- `scripts/create-tool/index.mjs`
- `README.md`
- `README.zh-CN.md`
- `tools/*/package.json`
- `tools/*/ToolClient.tsx` or renamed `tools/*/app.tsx`

**Delete later**
- `apps/web/app/[locale]/tools/[slug]/page.tsx`
- `apps/web/components/tool-client-loader.tsx`
- `ToolClient.tsx` compatibility paths after full migration

---

### Task 1: Upgrade the shared tool contract

**Files:**
- Modify: `packages/tool-contracts/src/index.ts`
- Modify: `packages/tool-sdk/src/types.ts`

- [ ] Add a new `ToolAppProps` interface with `manifest`, `locale`, `path`, and `segments`.
- [ ] Keep `ToolClientProps` temporarily as a compatibility alias or legacy export during migration.
- [ ] Update `packages/tool-sdk/src/types.ts` to export `ToolAppProps` and keep legacy types available until the final cleanup pass.
- [ ] Define the target contract clearly:

```ts
export interface ToolAppProps {
  manifest: ToolManifest;
  locale: string;
  path: string;
  segments: string[];
}
```

- [ ] Acceptance check: existing packages can still typecheck while new loaders and tools start importing `ToolAppProps`.

---

### Task 2: Extend the generated registry to support `./app`

**Files:**
- Modify: `scripts/generate-tool-registry.mjs`
- Modify: `packages/tool-sdk/src/generated/client-loaders.ts`
- Modify: `packages/tool-sdk/package.json` indirectly via generator

- [ ] Change the generator to detect `app.tsx` first and `ToolClient.tsx` second during migration.
- [ ] Generate app loaders with this precedence:
  - `app.tsx` exists -> import `@tool-platform/<tool-id>/app`
  - otherwise -> import `@tool-platform/<tool-id>/tool`
- [ ] Rename generated types from `ToolComponentLoader` to `ToolAppLoader` once all call sites are ready, or keep both names temporarily.
- [ ] Add explicit migration comments in the generator so future cleanup is obvious.
- [ ] Acceptance check: `pnpm generate:tools` produces valid loaders for mixed tool states.

---

### Task 3: Replace the SDK client loader API

**Files:**
- Modify: `packages/tool-sdk/src/client.ts`

- [ ] Replace `getToolComponentLoader()` / `loadToolComponent()` with `getToolAppLoader()` / `loadToolApp()`.
- [ ] Keep temporary wrapper exports:
  - `loadToolComponent()` delegates to `loadToolApp()`
  - remove this wrapper only in the final compatibility cleanup
- [ ] Preserve the runtime behavior of returning `module.default`.
- [ ] Acceptance check: web app can load both a migrated tool and an unmigrated tool without changing runtime semantics.

---

### Task 4: Move the web route to catch-all and pass path context

**Files:**
- Create: `apps/web/app/[locale]/tools/[slug]/[[...segments]]/page.tsx`
- Delete later: `apps/web/app/[locale]/tools/[slug]/page.tsx`

- [ ] Change the tool route from `/tools/[slug]` to `/tools/[slug]/[[...segments]]`.
- [ ] Preserve current metadata generation, but make it read `{ locale, slug, segments }`.
- [ ] Keep tool page chrome unchanged: topbar, manifest metadata, guide, runtime card, favorite button.
- [ ] Pass `locale`, full `path`, and `segments` into the new loader.
- [ ] Treat `/tools/<slug>` and `/tools/<slug>/...` as the same manifest lookup target.
- [ ] Acceptance check:
  - `/zh/tools/json-formatter`
  - `/zh/tools/json-formatter/foo`
  both resolve the same manifest and render through the unified loader.

---

### Task 5: Replace `ToolClientLoader` with `ToolAppLoader`

**Files:**
- Create: `apps/web/components/tool-app-loader.tsx`
- Delete later: `apps/web/components/tool-client-loader.tsx`

- [ ] Build a new client loader that imports `loadToolApp()` from `@tool-platform/tool-sdk/client`.
- [ ] Change the missing component fallback to accept `ToolAppProps`.
- [ ] Compute `path` and `segments` from the active route in the client so cached tab content still updates correctly when the URL changes inside the same tool.
- [ ] Keep the current loading UI and error UI semantics.
- [ ] During migration, support both generated loader sources through `loadToolApp()`, not through separate UI branches.
- [ ] Acceptance check: loader works with one migrated tool and one legacy tool in the same build.

---

### Task 6: Normalize workspace tabs to tool scope

**Files:**
- Modify: `apps/web/components/workspace-tabs.tsx`
- Modify: `apps/web/components/platform-shell.tsx`

- [ ] Add a helper that normalizes any tool subpath to its root tab id:

```ts
function normalizeWorkspaceTabPath(pathname: string) {
  const clean = normalizePathname(pathname);
  const match = clean.match(/^\/tools\/([^/]+)(?:\/.*)?$/);
  return match ? `/tools/${match[1]}` : clean;
}
```

- [ ] Use the normalized tool root as `activeTabId`.
- [ ] Keep `PlatformShell` predeclared tool tabs at `/tools/<id>` only.
- [ ] Do not create separate tabs for `/tools/foo/schema` and `/tools/foo/query`.
- [ ] Preserve current tab close/open/session restore behavior.
- [ ] Acceptance check:
  - opening `/tools/sql-playground`
  - navigating to `/tools/sql-playground/schema`
  still uses a single workspace tab named `SQL Playground`.

---

### Task 7: Update the tool scaffold to generate `app.tsx`

**Files:**
- Modify: `scripts/create-tool/index.mjs`

- [ ] Change the generated source file from `ToolClient.tsx` to `app.tsx`.
- [ ] Change generated `package.json` exports from:

```json
{
  "./manifest": "./manifest.ts",
  "./tool": "./ToolClient.tsx"
}
```

to:

```json
{
  "./manifest": "./manifest.ts",
  "./app": "./app.tsx"
}
```

- [ ] Generate the starter component against `ToolAppProps`.
- [ ] Update scaffolded README snippets to describe `app.tsx` as the standard tool entry.
- [ ] Acceptance check: `pnpm create-tool foo-bar ...` produces a package that the new registry recognizes without manual edits.

---

### Task 8: Update the docs to reflect the new contract

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] Replace all mentions of `ToolClient.tsx` as the canonical entry with `app.tsx`.
- [ ] Update examples, directory tree, exports, and workflow commands.
- [ ] Explicitly document that:
  - single-page tools still use `app.tsx`
  - multi-page tools may route internally by `segments`
  - tools are not standalone Next.js apps
- [ ] Add a migration note describing temporary compatibility with legacy `ToolClient.tsx`.
- [ ] Acceptance check: a new contributor can create a tool from the README without discovering hidden migration rules.

---

### Task 9: Run the first migration on one tool

**Files:**
- Modify: `tools/sql-playground/package.json`
- Rename or create: `tools/sql-playground/app.tsx`

- [ ] Rename `ToolClient.tsx` to `app.tsx` or create `app.tsx` that re-exports the current default component.
- [ ] Change package exports to `./app`.
- [ ] Validate that the migrated tool loads through the new loader path while legacy tools still load through compatibility.
- [ ] Keep this task intentionally narrow: prove the platform contract works before bulk migration.
- [ ] Acceptance check: one tool is fully on `app.tsx`, the rest are still legacy, and the app still builds.

---

### Task 10: Batch-migrate the remaining tools

**Files:**
- Modify: `tools/*/package.json`
- Rename: `tools/*/ToolClient.tsx -> tools/*/app.tsx`

- [ ] Write or run a repo-local migration script to bulk rename tool entry files and exports.
- [ ] Migrate tools in small batches if needed to reduce review risk.
- [ ] Re-run `pnpm generate:tools` after each batch or once after the scripted rename.
- [ ] Spot-check at least one tool per runtime family:
  - simple
  - worker
  - wasm
  - ai
  - sandbox/realtime if present
- [ ] Acceptance check: no generated loader points at `/tool` anymore.

---

### Task 11: Remove the compatibility layer

**Files:**
- Modify: `scripts/generate-tool-registry.mjs`
- Modify: `packages/tool-sdk/src/client.ts`
- Delete: `apps/web/components/tool-client-loader.tsx`
- Delete: any temporary compatibility aliases for `ToolClientProps` and `loadToolComponent`

- [ ] Remove generator fallback to `ToolClient.tsx`.
- [ ] Remove `./tool` compatibility imports.
- [ ] Remove legacy exports and helper names once all tools are migrated.
- [ ] Delete the old route file if it still exists.
- [ ] Acceptance check: the repo has no functional dependence on `ToolClient.tsx` or `./tool`.

---

## Verification

- [ ] Run `pnpm generate:tools`
- [ ] Run `pnpm build`
- [ ] Run `pnpm lint`
- [ ] Manually verify one root tool URL and one nested tool URL
- [ ] Manually verify workspace tab behavior for nested tool routes
- [ ] Manually verify a migrated tool and an unmigrated tool during the compatibility phase

## Risks

- Catch-all route + tab cache can drift if `segments` are derived only on the server. The loader should derive them from the current client pathname.
- Bulk migration will touch many files. Keep the compatibility phase until one migrated tool proves the platform contract works end-to-end.
- Generated registry output is a critical integration point. Any mismatch between package exports and generated imports will break tool loading globally.

## Exit Criteria

- Every tool package exports `./app`
- Every tool uses `app.tsx`
- Tool pages resolve through `/tools/[slug]/[[...segments]]`
- Workspace tabs remain tool-scoped
- No compatibility branch for `ToolClient.tsx` remains
