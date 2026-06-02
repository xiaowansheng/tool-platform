import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "typescript-playground",
  name: "TypeScript Playground",
  description: "在浏览器中编译并运行 TypeScript 代码，支持现代语法、async/await 和 console 输出。",
  category: "developer-tools",
  subCategory: "language",
  tags: ["typescript", "javascript", "playground", "compiler"],
  icon: "terminal",
  featured: true,
  runtime: "worker",
  worker: true
};

export default manifest;
