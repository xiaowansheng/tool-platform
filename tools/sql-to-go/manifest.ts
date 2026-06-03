import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sql-to-go",
  name: "SQL 转 Go Struct 工具",
  description: "将 SQL 建表语句 (CREATE TABLE) 本地解析并生成带 GORM、JSON 标签的 Go (Golang) 结构体 (struct) 声明。",
  category: "developer-tools",
  subCategory: "golang",
  tags: ["sql", "golang", "go-struct", "gorm", "database"],
  icon: "database",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
