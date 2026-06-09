import assert from "node:assert/strict";
import test from "node:test";

import type { ToolManifest } from "@tool-platform/tool-contracts";

import { DEFAULT_REMOTE_IFRAME_SANDBOX, resolveToolMicroFrontendAdapter } from "./micro-frontend";

const baseManifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "Format JSON",
  category: "data-tools",
  tags: ["json"],
  icon: "braces",
  runtime: "simple"
};

test("resolveToolMicroFrontendAdapter defaults registered tools to local adapters", () => {
  const adapter = resolveToolMicroFrontendAdapter(baseManifest);

  assert.equal(adapter.kind, "local");
  assert.equal(adapter.kind === "local" ? typeof adapter.loader : undefined, "function");
});

test("resolveToolMicroFrontendAdapter resolves iframe adapters from manifest config", () => {
  const adapter = resolveToolMicroFrontendAdapter({
    ...baseManifest,
    runtime: "remote",
    microFrontend: {
      kind: "iframe",
      url: "https://tools.example.com/json",
      allow: "clipboard-write",
      title: "Remote JSON Formatter"
    }
  });

  assert.deepEqual(adapter, {
    kind: "iframe",
    url: "https://tools.example.com/json",
    sandbox: DEFAULT_REMOTE_IFRAME_SANDBOX,
    allow: "clipboard-write",
    title: "Remote JSON Formatter"
  });
});

test("resolveToolMicroFrontendAdapter reports missing local loaders", () => {
  const adapter = resolveToolMicroFrontendAdapter({
    ...baseManifest,
    id: "missing-tool"
  });

  assert.deepEqual(adapter, {
    kind: "missing",
    reason: "local-loader-not-found"
  });
});

test("resolveToolMicroFrontendAdapter reports remote manifests without iframe config", () => {
  const adapter = resolveToolMicroFrontendAdapter({
    ...baseManifest,
    id: "misconfigured-remote-tool",
    runtime: "remote"
  });

  assert.deepEqual(adapter, {
    kind: "missing",
    reason: "remote-adapter-missing"
  });
});
