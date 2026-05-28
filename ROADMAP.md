# Roadmap

This roadmap describes the current direction of Tool Platform. It is not a promise of delivery dates; it is a shared planning document for contributors.

## Phase One: Platform Foundation

Current focus:

- Next.js web shell with category, search, and dynamic tool routes.
- pnpm workspace and Turborepo monorepo structure.
- Tool manifest registration and generated registry.
- Basic runtime packages for simple, worker, wasm, ai, sandbox, and realtime tool types.
- Browser SDK for clipboard, download, file opening, OPFS, toast, runtime lifecycle, Worker, WASM, AI, and iframe sandbox capabilities.
- Open source governance and CI quality gates.

## Phase Two: Tool Quality and Coverage

Planned work:

- Improve test coverage for high-risk tools and shared SDK behavior.
- Add UI regression or smoke tests for tool loading and category/search pages.
- Add per-tool documentation expectations and examples.
- Improve accessibility for keyboard navigation, focus states, and screen reader labels.
- Add stronger validation for manifest fields and category coverage.

## Phase Three: Runtime Hardening

Planned work:

- Worker runtime patterns for CPU-heavy and large-file tools.
- WASM loading, caching, fallback, and error reporting improvements.
- iframe sandbox policy hardening and clearer permission boundaries.
- AI runtime provider boundaries, local/remote disclosure, and model capability metadata.
- Better large-file processing patterns with progress and cancellation.

## Phase Four: Distribution and Community

Potential work:

- Public demo deployment.
- Versioned releases and release notes automation.
- Contributor-friendly good first issues.
- Optional plugin marketplace or external tool package model.
- Documentation site for tool authoring and runtime APIs.
