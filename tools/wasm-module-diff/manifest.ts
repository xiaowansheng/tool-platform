import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "wasm-module-diff",
  name: "WASM Module Diff",
  description: "对比两个 WASM 模块的 section 结构、导出/导入项与类型定义的差异。",
  category: "developer-tools",
  tags: ["wasm", "diff", "webassembly", "compare"],
  icon: "git-compare",
  runtime: "wasm",
  featured: false,
  capabilities: ["wasm-compare", "section-diff"],
  memoryLimit: 256,
  permissions: ["filesystem"]
};

export default manifest;
