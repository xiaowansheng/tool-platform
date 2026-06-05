import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "resume-builder",
  name: "Resume Builder",
  description: "简历模板编辑器，支持 Markdown 编辑与结构化预览。",
  category: "office-tools",
  tags: ["resume", "cv", "template", "export"],
  icon: "file-text",
  runtime: "simple",
  featured: false
};

export default manifest;
