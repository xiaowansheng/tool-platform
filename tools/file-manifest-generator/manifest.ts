import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "file-manifest-generator",
  name: "File Manifest Generator",
  description: "从目录结构文本生成文件清单（manifest），支持 JSON / YAML / Markdown 输出格式。",
  category: "developer-tools",
  subCategory: "scaffold",
  tags: ["file", "manifest", "directory", "tree", "structure", "generator"],
  icon: "folder-tree",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
