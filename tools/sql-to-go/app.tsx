"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const SQL_SAMPLE = `CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  balance DECIMAL(12, 2) DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  raw_payload JSON,
  KEY idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

function toCamelCase(str: string): string {
  if (!str) return "Field";
  return str
    .split(/[-_\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "");
}

function sqlToGo(sql: string, includeGorm: boolean = true): string {
  // Strip comments
  const cleanSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*/g, "");

  // Extract table name
  const tableMatch = cleanSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["'\`]?)([a-zA-Z_]\w*)(?:["'\`]?)/i);
  if (!tableMatch) {
    return "// 错误: 无法解析 CREATE TABLE 语句。请确保输入了合规的 SQL 建表 DDL 语句。";
  }
  const tableName = tableMatch[1];
  const structName = toCamelCase(tableName);

  // Extract fields between parentheses
  const firstParen = cleanSql.indexOf("(");
  const lastParen = cleanSql.lastIndexOf(")");
  if (firstParen === -1 || lastParen === -1) {
    return "// 错误: 缺少括号，无法解析字段结构。";
  }

  const columnsBody = cleanSql.substring(firstParen + 1, lastParen);
  
  // Split columns by comma safely, counting parent depths to bypass decimal bounds like (10, 2)
  const columns: string[] = [];
  let currentColumn = "";
  let parenDepth = 0;

  for (let i = 0; i < columnsBody.length; i++) {
    const char = columnsBody[i];
    if (char === "(") parenDepth++;
    if (char === ")") parenDepth--;

    if (char === "," && parenDepth === 0) {
      columns.push(currentColumn.trim());
      currentColumn = "";
    } else {
      currentColumn += char;
    }
  }
  if (currentColumn.trim()) {
    columns.push(currentColumn.trim());
  }

  // Parse each column definition
  const goFields: string[] = [];
  let hasTime = false;

  columns.forEach(col => {
    const upperCol = col.toUpperCase().trim();
    if (!upperCol) return;

    // Skip table constraints
    if (
      upperCol.startsWith("PRIMARY KEY") ||
      upperCol.startsWith("KEY") ||
      upperCol.startsWith("INDEX") ||
      upperCol.startsWith("UNIQUE KEY") ||
      upperCol.startsWith("CONSTRAINT") ||
      upperCol.startsWith("FOREIGN KEY") ||
      upperCol.startsWith("UNIQUE")
    ) {
      return;
    }

    // Match name, type and optional size: `column` TYPE(args)
    const colMatch = col.match(/^(?:["'\`]?)([a-zA-Z_]\w*)(?:["'\`]?)\s+(\w+)(?:\((.*?)\))?/i);
    if (!colMatch) return;

    const colName = colMatch[1];
    const sqlType = colMatch[2].toUpperCase();
    const typeArgs = colMatch[3] || "";

    const goKey = toCamelCase(colName);
    let goType = "string";

    // Map SQL data types to Go types
    if (["INT", "INTEGER", "TINYINT", "SMALLINT", "MEDIUMINT"].includes(sqlType)) {
      if ((sqlType === "TINYINT" && typeArgs === "1") || upperCol.includes("TINYINT(1)")) {
        goType = "bool";
      } else {
        goType = "int";
        if (upperCol.includes("UNSIGNED")) {
          goType = "uint";
        }
      }
    } else if (["BIGINT"].includes(sqlType)) {
      goType = "int64";
      if (upperCol.includes("UNSIGNED")) {
        goType = "uint64";
      }
    } else if (["FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "REAL"].includes(sqlType)) {
      goType = "float64";
    } else if (["BOOLEAN", "BOOL"].includes(sqlType)) {
      goType = "bool";
    } else if (["DATE", "DATETIME", "TIMESTAMP", "TIME"].includes(sqlType)) {
      goType = "time.Time";
      hasTime = true;
    } else if (["JSON", "JSONB"].includes(sqlType)) {
      goType = "interface{}";
    } else if (["BLOB", "BINARY", "VARBINARY", "BYTEA"].includes(sqlType)) {
      goType = "[]byte";
    } else {
      goType = "string"; // varchars, chars, texts, uuid, etc.
    }

    // Build tags
    let tags = `json:"${colName}"`;
    if (includeGorm) {
      let gormConfig = `column:${colName}`;
      // Basic PK & AI detection in column constraints
      if (upperCol.includes("PRIMARY KEY")) {
        gormConfig += ";primaryKey";
      }
      if (upperCol.includes("AUTO_INCREMENT") || upperCol.includes("SERIAL")) {
        gormConfig += ";autoIncrement";
      }
      if (upperCol.includes("NOT NULL")) {
        gormConfig += ";not null";
      }
      tags += ` gorm:"${gormConfig}"`;
    }

    goFields.push(`\t${goKey} ${goType} \`${tags}\``);
  });

  const imports = hasTime ? 'import (\n\t"time"\n)\n\n' : "";
  const structHeader = `type ${structName} struct {\n`;
  const structBody = goFields.join("\n") + "\n}";

  return `${imports}${structHeader}${structBody}`;
}

export default function SqlToGoTool({ manifest }: ToolAppProps) {
  const [sqlInput, setSqlInput] = useState(SQL_SAMPLE);
  const [includeGorm, setIncludeGorm] = useState(true);
  const [copied, setCopied] = useState(false);

  const goOutput = sqlToGo(sqlInput, includeGorm);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(goOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    setSqlInput("");
    setCopied(false);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据结构与运维</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Preset Toolbar */}
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
          <button type="button" className="button--secondary" onClick={() => setSqlInput(SQL_SAMPLE)}>
            加载 SQL 示例
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", paddingRight: "0.5rem" }}>
            <input
              type="checkbox"
              checked={includeGorm}
              onChange={(e) => setIncludeGorm(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            生成 GORM 标签
          </label>
          <button type="button" className="button--danger" onClick={handleClear}>
            清空
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="workspace workspace--two-column">
        {/* SQL Input Pane */}
        <label className="tool-field">
          <span>SQL 建表 DDL (MySQL/PostgreSQL)</span>
          <textarea
            value={sqlInput}
            onChange={(e) => {
              setSqlInput(e.target.value);
              setCopied(false);
            }}
            placeholder="请在此处粘贴 CREATE TABLE SQL 语句..."
            spellCheck={false}
            style={{ height: "380px", fontFamily: "monospace", resize: "vertical" }}
          />
        </label>

        {/* Go Struct Output Pane */}
        <label className="tool-field">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Go Struct 结构体模型
            <button
              type="button"
              onClick={handleCopy}
              disabled={!goOutput || goOutput.startsWith("// 错误")}
              style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", height: "auto" }}
            >
              {copied ? "已复制" : "复制"}
            </button>
          </span>
          <textarea
            value={goOutput}
            readOnly
            placeholder="Go Struct 结构体定义将在此处生成..."
            spellCheck={false}
            style={{ height: "380px", fontFamily: "monospace", resize: "vertical" }}
          />
        </label>
      </div>

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        提示：类型映射将自动检测 <strong>unsigned</strong> 字段映射为 Go 无符号整型（如 <code>uint</code>，<code>uint64</code>），建表约束（如 <code>PRIMARY KEY</code>）和自动递增标志会精准翻译为 <code>primaryKey;autoIncrement</code> 的 GORM 结构体标签。
      </p>
    </section>
  );
}
