import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "docker-run-to-compose",
  name: "Docker Run to Compose",
  description: "把常见 docker run 命令转换为 compose.yaml 服务草稿，保留端口、环境变量、挂载和重启策略。",
  category: "运维工具",
  subCategory: "container",
  tags: ["docker", "compose", "container", "yaml", "migration"],
  icon: "container",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["docker-run-parse", "compose-yaml", "container-migration"]
};

export default manifest;
