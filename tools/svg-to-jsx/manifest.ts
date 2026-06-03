import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "svg-to-jsx",
  name: "SVG 转 JSX 转换器",
  description: "将 SVG 代码转换为 React JSX 组件，自动转换属性名为驼峰命名，支持 TypeScript 和 memo 包裹",
  category: "developer-tools",
  subCategory: "converters",
  tags: ["svg", "jsx", "react", "converter"],
  icon: "code",
  runtime: "simple",
  featured: false
};

export default manifest;
