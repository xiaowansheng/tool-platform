import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-to-go",
  name: "JSON 转 Go Struct 工具",
  description: "将 JSON 示例数据本地快速转换为带有 JSON 结构标签的 Go (Golang) struct 结构体定义。",
  category: "developer-tools",
  subCategory: "golang",
  tags: ["json", "golang", "go-struct", "struct", "convert"],
  icon: "code-2",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
