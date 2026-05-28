import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "webgpu-capability-reporter",
  name: "WebGPU Capability Reporter",
  description: "查询浏览器 WebGPU adapter、features、limits 和 device 创建结果，便于定位图形/计算能力差异。",
  category: "developer-tools",
  subCategory: "graphics",
  tags: ["webgpu", "gpu", "adapter", "features", "limits"],
  icon: "gpu",
  runtime: "simple",
  featured: false,
  permissions: ["webgpu", "clipboard"],
  capabilities: ["webgpu-adapter", "hardware-capabilities", "copyable-report"]
};

export default manifest;
