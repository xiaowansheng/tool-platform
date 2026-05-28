import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "dockerfile-linter",
  name: "Dockerfile Linter",
  description: "检查 Dockerfile 的基础镜像、缓存、安全和运行时风险。",
  category: "ops",
  subCategory: "container",
  tags: ["docker", "dockerfile", "container", "lint"],
  icon: "container",
  runtime: "simple",
  featured: false
};

export default manifest;
