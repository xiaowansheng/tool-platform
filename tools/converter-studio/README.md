# @tool-platform/converter-studio

Converter Studio 是一个一站式代码与数据格式转换工坊。它整合了以下 9 个零散的转换工具：

1. **YAML/JSON/TOML (YAML/JSON/TOML/Properties Converter)** (`yaml-json-toml-converter`)
2. **CSV/JSON/NDJSON (CSV/JSON/NDJSON Converter)** (`csv-json-ndjson-converter`)
3. **JSON 转 TS (JSON to TypeScript)** (`json-to-ts`)
4. **JSON 转 Go (JSON to Go Struct)** (`json-to-go`)
5. **JSON 转 SQL (JSON to SQL Schema/Insert)** (`json-to-sql`)
6. **SQL 转 Go (SQL to Go Struct)** (`sql-to-go`)
7. **SVG 转 JSX (SVG to JSX Component)** (`svg-to-jsx`)
8. **MD 互转 HTML (Markdown <=> HTML Converter)** (`markdown-html-converter`)
9. **htaccess 转 Nginx (Apache htaccess to Nginx rewrite rules)** (`htaccess-to-nginx`)

## 共享状态设计
所有选项卡（Tabs）都订阅并同步共享的 `inputText` 状态。这意味着你在一个选项卡中输入或生成的数据/代码（例如一段 JSON），在切换到其它选项卡（如 JSON 转 TypeScript、YAML 转换或 CSV 转换等）时，都会自动加载并处理，免去了在不同工具之间反复复制粘贴的繁琐操作，实现高度流畅的开发工作流。
