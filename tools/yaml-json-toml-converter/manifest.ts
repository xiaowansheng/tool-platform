import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "yaml-json-toml-converter",
  name: "YAML JSON TOML Properties Converter",
  description: "在 JSON、轻量 YAML、轻量 TOML 和 Properties 配置片段之间互转。",
  category: "data-tools",
  subCategory: "config",
  tags: ["yaml", "json", "toml", "properties", "config"],
  icon: "file-cog",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
