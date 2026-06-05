import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "mouse-tester",
  name: "鼠标测试",
  description: "测试鼠标按键、滚轮、双击速度和指针追踪，可视化点击热力图。",
  category: "ops-tools",
  subCategory: "hardware",
  tags: ["mouse", "click-tester", "input", "hardware", "scroll"],
  icon: "mouse-pointer-2",
  runtime: "simple",
  featured: false,
  capabilities: [],
  permissions: []
};

export default manifest;
