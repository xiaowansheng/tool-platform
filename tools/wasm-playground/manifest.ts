import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "wasm-playground",
  name: "WASM Playground",
  description: "上传或粘贴 .wasm 模块，编译并查看 section 结构、导出/导入函数签名，实时调用测试。",
  category: "developer-tools",
  tags: ["wasm", "webassembly", "playground", "compile"],
  icon: "box",
  runtime: "wasm",
  featured: false,
  capabilities: ["wasm-compile", "module-inspect", "function-call"],
  memoryLimit: 256,
  permissions: ["filesystem", "clipboard"]
};

export default manifest;
