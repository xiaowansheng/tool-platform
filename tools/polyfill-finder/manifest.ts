import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "polyfill-finder",
  name: "Polyfill Finder",
  description: "检查 JS/TS 代码中需要 polyfill 的 API，提供兼容性建议。",
  category: "developer-tools",
  tags: ["polyfill", "compatibility", "browser"],
  icon: "puzzle",
  runtime: "simple",
  featured: false
};

export default manifest;
