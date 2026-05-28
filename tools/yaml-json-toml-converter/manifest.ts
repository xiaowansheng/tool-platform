import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "yaml-json-toml-converter",
  name: "YAML JSON TOML Converter",
  description: "在 JSON、轻量 YAML 和轻量 TOML 配置片段之间互转。",
  category: "developer",
  subCategory: "config",
  tags: ["yaml", "json", "toml", "config"],
  icon: "file-cog",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
