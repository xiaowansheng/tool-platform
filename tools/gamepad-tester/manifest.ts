import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "gamepad-tester",
  name: "手柄测试",
  description: "使用 Gamepad API 测试手柄按键、摇杆、扳机和震动马达。",
  category: "ops-tools",
  subCategory: "hardware",
  tags: ["gamepad", "controller", "joystick", "input", "hardware"],
  icon: "gamepad-2",
  runtime: "simple",
  featured: false,
  capabilities: [],
  permissions: []
};

export default manifest;
