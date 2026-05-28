import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "docker-compose-validator",
  name: "Docker Compose Validator",
  description: "快速检查 Compose services、镜像标签、端口、权限和健康检查。",
  category: "运维工具",
  subCategory: "container",
  tags: ["docker", "compose", "yaml", "validator"],
  icon: "boxes",
  runtime: "simple",
  featured: false
};

export default manifest;
