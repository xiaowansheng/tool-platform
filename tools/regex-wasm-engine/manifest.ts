import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "regex-wasm-engine",
  name: "Regex WASM Engine",
  description: "基于 WASM 编译的高性能正则表达式引擎，支持大型文本匹配与 JS/WASM 性能基准对比。",
  category: "text-tools",
  tags: ["regex", "wasm", "performance", "benchmark"],
  icon: "regex",
  runtime: "wasm",
  featured: false,
  capabilities: ["wasm-regex", "benchmark"],
  memoryLimit: 256,
  permissions: ["clipboard"]
};

export default manifest;
