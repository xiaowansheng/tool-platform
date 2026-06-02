import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "python-playground",
  name: "Python Playground",
  description: "通过 Pyodide (WASM) 在浏览器中运行 Python 代码，支持 pip 包安装和实时输出。",
  category: "developer-tools",
  subCategory: "language",
  tags: ["python", "pyodide", "wasm", "playground", "interpreter"],
  icon: "terminal",
  runtime: "worker",
  featured: true,
  worker: true
};

export default manifest;
