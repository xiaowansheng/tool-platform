import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "wasm-integer-math-lab",
  name: "WASM Integer Math Lab",
  description: "实验整数运算的溢出、截断和位操作行为，可视化不同位宽下的计算结果。",
  category: "developer-tools",
  subCategory: "debug",
  tags: ["wasm", "integer", "overflow", "bitwise", "math", "u8", "i32", "i64"],
  icon: "calculator",
  runtime: "simple",
  featured: false,
  permissions: []
};

export default manifest;
