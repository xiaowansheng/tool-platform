import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "systemd-unit-analyzer",
  name: "systemd Unit Analyzer",
  description: "解析 systemd service/unit 文件，检查重启策略、运行用户、依赖关系和常见安全加固项。",
  category: "运维工具",
  subCategory: "service",
  tags: ["systemd", "linux", "service", "hardening", "ops"],
  icon: "server-cog",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["unit-parse", "hardening-check", "ops-review"]
};

export default manifest;
