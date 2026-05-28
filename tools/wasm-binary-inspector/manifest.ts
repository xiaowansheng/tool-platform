import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "wasm-binary-inspector",
  name: "WASM Binary Inspector",
  description: "解析 WebAssembly 二进制模块的 section、import/export、大小结构，并用 WASM runtime 编译校验。",
  category: "开发工具",
  subCategory: "wasm",
  tags: ["wasm", "webassembly", "binary", "sections", "runtime"],
  icon: "box",
  runtime: "wasm",
  featured: false,
  permissions: ["clipboard", "filesystem"],
  capabilities: ["wasm-compile", "binary-inspection", "module-cache"],
  memoryLimit: 256
};

export default manifest;
