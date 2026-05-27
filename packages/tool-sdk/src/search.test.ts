import assert from "node:assert/strict";
import test from "node:test";

import type { ToolManifest } from "@tool-platform/tool-contracts";

import { groupToolsByCategory, searchTools } from "./search";

const tools: ToolManifest[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "格式化 JSON",
    category: "developer",
    tags: ["json", "formatter"],
    icon: "braces",
    runtime: "simple"
  },
  {
    id: "base64-studio",
    name: "Base64 Studio",
    description: "编码解码文本",
    category: "text",
    tags: ["base64", "encoding"],
    icon: "binary",
    runtime: "simple"
  }
];

test("searchTools matches by name, tag, and category metadata", () => {
  assert.equal(searchTools(tools, "json").length, 1);
  assert.equal(searchTools(tools, "编码").length, 1);
  assert.equal(searchTools(tools, "开发").length, 1);
});

test("groupToolsByCategory returns all documented categories in order", () => {
  const groups = groupToolsByCategory(tools);

  assert.equal(groups[0]?.category.id, "developer");
  assert.equal(groups[0]?.tools.length, 1);
  assert.equal(groups[2]?.category.id, "text");
  assert.equal(groups[2]?.tools.length, 1);
  assert.ok(groups.every((group) => Array.isArray(group.tools)));
});
