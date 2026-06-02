import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ruby-playground",
  name: "Ruby Playground",
  description: "通过 ruby.wasm 在浏览器中运行 Ruby 代码，并查看标准输出结果。",
  category: "developer-tools",
  subCategory: "language",
  tags: ["ruby", "wasm", "playground", "interpreter"],
  icon: "terminal",
  featured: true,
  runtime: "worker",
  worker: true
};

export default manifest;
