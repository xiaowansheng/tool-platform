import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "keyboard-tester",
  name: "键盘测试",
  description: "检测键盘按键是否正常工作，显示按键代码和可视化键盘布局。",
  category: "ops-tools",
  subCategory: "hardware",
  tags: ["keyboard", "key-tester", "input", "hardware", "key-code"],
  icon: "keyboard",
  runtime: "simple",
  featured: false,
  capabilities: [],
  permissions: []
};

export default manifest;
