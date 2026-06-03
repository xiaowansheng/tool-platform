"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ColumnInfo {
  name: string;
  type: string;
  selected: boolean;
}

const SAMPLE_JSON = `[
  {
    "id": 1,
    "name": "Alice Smith",
    "email": "alice@example.com",
    "age": 28,
    "is_active": true,
    "score": 95.5,
    "created_at": "2026-06-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Bob Jones",
    "email": "bob@example.com",
    "age": 34,
    "is_active": false,
    "score": 88.0,
    "created_at": "2026-06-02T08:30:00Z"
  },
  {
    "id": 3,
    "name": "Charlie Brown",
    "email": "charlie@example.com",
    "age": 22,
    "is_active": true,
    "score": 91.2,
    "created_at": "2026-06-03T15:45:00Z"
  }
]`;

function detectType(val: any): string {
  if (val === null || val === undefined) return "VARCHAR(255)";
  if (typeof val === "boolean") return "BOOLEAN";
  if (typeof val === "number") {
    return Number.isInteger(val) ? "INT" : "DECIMAL(10, 2)";
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(val)) return "TIMESTAMP";
    return "VARCHAR(255)";
  }
  if (typeof val === "object") return "TEXT";
  return "VARCHAR(255)";
}

function escapeIdentifier(id: string, dialect: string): string {
  if (dialect === "mysql") return `\`${id}\``;
  if (dialect === "postgresql" || dialect === "sqlite") return `"${id}"`;
  if (dialect === "mssql") return `[${id}]`;
  return id;
}

function escapeValue(val: any, dialect: string): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") {
    if (dialect === "mysql" || dialect === "sqlite") return val ? "1" : "0";
    return val ? "TRUE" : "FALSE";
  }
  if (typeof val === "number") {
    return val.toString();
  }
  if (typeof val === "object") {
    const str = JSON.stringify(val).replace(/'/g, "''");
    return `'${str}'`;
  }
  const strVal = val.toString().replace(/'/g, "''");
  return `'${strVal}'`;
}

export default function JsonToSqlTool({ manifest }: ToolAppProps) {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [tableName, setTableName] = useState("users");
  const [dialect, setDialect] = useState<"mysql" | "postgresql" | "sqlite" | "mssql">("mysql");
  const [insertMode, setInsertMode] = useState<"insert" | "ignore" | "replace" | "update">("insert");
  const [batchMode, setBatchMode] = useState<"single" | "batch">("batch");
  const [generateCreate, setGenerateCreate] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const [parseError, setParseError] = useState<string | null>(null);
  const [customColumns, setCustomColumns] = useState<Record<string, { type: string; selected: boolean }>>({});

  // Parse JSON and detect keys
  const parsedRows = useMemo(() => {
    setParseError(null);
    if (!jsonInput.trim()) return [];

    try {
      const obj = JSON.parse(jsonInput);
      const rows = Array.isArray(obj) ? obj : [obj];

      // Build unique keys mapping and automatically detect types
      const detected: Record<string, string> = {};
      for (const row of rows) {
        if (row && typeof row === "object") {
          for (const key of Object.keys(row)) {
            if (!(key in detected)) {
              detected[key] = detectType(row[key]);
            } else if (detected[key] === "VARCHAR(255)" && detectType(row[key]) !== "VARCHAR(255)") {
              // upgrade standard VARCHAR if we detect structured objects/dates
              detected[key] = detectType(row[key]);
            }
          }
        }
      }

      // Sync customColumns state
      const nextCustomCols: typeof customColumns = { ...customColumns };
      // Remove stale columns
      for (const key of Object.keys(nextCustomCols)) {
        if (!(key in detected)) delete nextCustomCols[key];
      }
      // Add/update new columns
      for (const key of Object.keys(detected)) {
        if (!(key in nextCustomCols)) {
          nextCustomCols[key] = { type: detected[key], selected: true };
        }
      }
      // Only set if changed to avoid loop
      const changed = JSON.stringify(customColumns) !== JSON.stringify(nextCustomCols);
      if (changed) {
        setCustomColumns(nextCustomCols);
      }

      return rows;
    } catch (err: any) {
      setParseError(`JSON 解析失败: ${err.message}`);
      return [];
    }
  }, [jsonInput]);

  const columnsList = useMemo(() => {
    return Object.keys(customColumns).map((name) => ({
      name,
      type: customColumns[name].type,
      selected: customColumns[name].selected
    }));
  }, [customColumns]);

  const handleColumnToggle = (name: string) => {
    setCustomColumns((prev) => ({
      ...prev,
      [name]: { ...prev[name], selected: !prev[name].selected }
    }));
  };

  const handleColumnTypeChange = (name: string, type: string) => {
    setCustomColumns((prev) => ({
      ...prev,
      [name]: { ...prev[name], type }
    }));
  };

  const handleSelectAll = (select: boolean) => {
    setCustomColumns((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = { ...next[k], selected: select };
      }
      return next;
    });
  };

  // Generate SQL output
  const sqlOutput = useMemo(() => {
    if (parsedRows.length === 0) return "";

    const activeCols = columnsList.filter((c) => c.selected);
    if (activeCols.length === 0) return "-- 请至少选择一个字段";

    const statements: string[] = [];

    // 1. Create Table Statement
    if (generateCreate) {
      const colDefinitions = activeCols.map((c) => {
        const escapedCol = escapeIdentifier(c.name, dialect);
        return `  ${escapedCol} ${c.type}`;
      });
      const escapedTable = escapeIdentifier(tableName, dialect);
      statements.push(`CREATE TABLE IF NOT EXISTS ${escapedTable} (\n${colDefinitions.join(",\n")}\n);`);
      statements.push(""); // spacer
    }

    // 2. Insert Statement Generator
    const escapedTable = escapeIdentifier(tableName, dialect);
    const colNames = activeCols.map((c) => escapeIdentifier(c.name, dialect)).join(", ");

    const getInsertKeyword = () => {
      if (dialect === "mysql") {
        if (insertMode === "ignore") return "INSERT IGNORE INTO";
        if (insertMode === "replace") return "REPLACE INTO";
      }
      return "INSERT INTO";
    };

    const getSuffix = () => {
      if (insertMode === "ignore") {
        if (dialect === "postgresql") return " ON CONFLICT DO NOTHING";
        if (dialect === "sqlite") return " ON CONFLICT DO NOTHING";
      }
      if (insertMode === "update") {
        if (dialect === "mysql") {
          const updates = activeCols
            .filter((c) => c.name !== "id") // usually ignore id on update
            .map((c) => {
              const esc = escapeIdentifier(c.name, dialect);
              return `${esc} = VALUES(${esc})`;
            })
            .join(", ");
          return updates ? ` ON DUPLICATE KEY UPDATE ${updates}` : "";
        }
        if (dialect === "postgresql") {
          const updates = activeCols
            .filter((c) => c.name !== "id")
            .map((c) => {
              const esc = escapeIdentifier(c.name, dialect);
              return `${esc} = EXCLUDED.${esc}`;
            })
            .join(", ");
          return updates ? ` ON CONFLICT (id) DO UPDATE SET ${updates}` : " ON CONFLICT DO NOTHING";
        }
      }
      return "";
    };

    const insertKeyword = getInsertKeyword();
    const suffix = getSuffix();

    if (batchMode === "batch" && dialect !== "mssql") {
      // Batch mode INSERT INTO table (cols) VALUES (v1, v2), (v3, v4)...
      const chunks: string[][] = [];
      const chunkSize = 500; // max batch size to avoid huge SQL queries
      for (let i = 0; i < parsedRows.length; i += chunkSize) {
        chunks.push(parsedRows.slice(i, i + chunkSize));
      }

      for (const chunk of chunks) {
        const valuesBlock = chunk
          .map((row) => {
            const vals = activeCols.map((c) => escapeValue(row[c.name], dialect)).join(", ");
            return `  (${vals})`;
          })
          .join(",\n");
        statements.push(`${insertKeyword} ${escapedTable} (${colNames})\nVALUES\n${valuesBlock}${suffix};`);
      }
    } else {
      // Single inserts mode
      for (const row of parsedRows) {
        const vals = activeCols.map((c) => escapeValue(row[c.name], dialect)).join(", ");
        statements.push(`${insertKeyword} ${escapedTable} (${colNames}) VALUES (${vals})${suffix};`);
      }
    }

    return statements.join("\n");
  }, [parsedRows, tableName, dialect, insertMode, batchMode, generateCreate, columnsList]);

  const handleCopy = async () => {
    if (!sqlOutput) return;
    try {
      await navigator.clipboard.writeText(sqlOutput);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    if (!sqlOutput) return;
    const blob = new Blob([sqlOutput], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tableName}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }} className="json-to-sql-layout">
        {/* Left Side: Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label className="tool-field" style={{ margin: 0 }}>
            <span>JSON 数据输入 (支持单对象或数组)</span>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "13px", padding: "10px", border: parseError ? "1px solid #ef4444" : "1px solid #ccc", borderRadius: "6px" }}
              placeholder="在此粘贴或输入 JSON 数据..."
            />
          </label>
          {parseError && <p style={{ color: "#ef4444", fontSize: "12px", margin: "-12px 0 0 0" }}>{parseError}</p>}

          {/* Configuration Grid */}
          <div className="detail-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ fontWeight: "bold", margin: 0 }}>配置选项</h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label className="tool-field" style={{ margin: 0 }}>
                <span>数据库表名</span>
                <input type="text" value={tableName} onChange={(e) => setTableName(e.target.value)} style={{ padding: "6px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px" }} />
              </label>

              <label className="tool-field" style={{ margin: 0 }}>
                <span>SQL 方言 (Dialect)</span>
                <select value={dialect} onChange={(e: any) => setDialect(e.target.value)} style={{ padding: "6px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px" }}>
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="sqlite">SQLite</option>
                  <option value="mssql">SQL Server</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label className="tool-field" style={{ margin: 0 }}>
                <span>冲突处理模式</span>
                <select value={insertMode} onChange={(e: any) => setInsertMode(e.target.value)} style={{ padding: "6px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px" }}>
                  <option value="insert">标准 INSERT</option>
                  <option value="ignore" disabled={dialect === "mssql"}>INSERT IGNORE / CONFLICT DO NOTHING</option>
                  <option value="replace" disabled={dialect !== "mysql"}>REPLACE INTO (MySQL 专用)</option>
                  <option value="update" disabled={dialect !== "mysql" && dialect !== "postgresql"}>INSERT ON DUPLICATE KEY / CONFLICT UPDATE</option>
                </select>
              </label>

              <label className="tool-field" style={{ margin: 0 }}>
                <span>生成模式</span>
                <select value={batchMode} onChange={(e: any) => setBatchMode(e.target.value)} style={{ padding: "6px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px" }}>
                  <option value="batch">批量插入语句 (更高效)</option>
                  <option value="single">单条插入语句 (安全兼容)</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                <input type="checkbox" checked={generateCreate} onChange={(e) => setGenerateCreate(e.target.checked)} />
                <span>生成 CREATE TABLE 语句</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Side: Columns Mapping & Outputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Columns Config */}
          <div className="detail-card" style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ fontWeight: "bold", margin: 0 }}>字段映射与类型设置</h4>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={() => handleSelectAll(true)} style={{ padding: "2px 8px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px", background: "none", cursor: "pointer" }}>全选</button>
                <button type="button" onClick={() => handleSelectAll(false)} style={{ padding: "2px 8px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px", background: "none", cursor: "pointer" }}>全不选</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", maxHeight: "200px", border: "1px solid #eee", borderRadius: "4px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px", width: "40px" }}>选</th>
                    <th style={{ padding: "6px 8px" }}>字段名</th>
                    <th style={{ padding: "6px 8px", width: "140px" }}>SQL 数据类型</th>
                  </tr>
                </thead>
                <tbody>
                  {columnsList.map((col) => (
                    <tr key={col.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <input type="checkbox" checked={col.selected} onChange={() => handleColumnToggle(col.name)} style={{ cursor: "pointer" }} />
                      </td>
                      <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{col.name}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <select value={col.type} onChange={(e) => handleColumnTypeChange(col.name, e.target.value)} style={{ width: "100%", padding: "2px", fontSize: "12px" }}>
                          <option value="INT">INT</option>
                          <option value="BIGINT">BIGINT</option>
                          <option value="DECIMAL(10, 2)">DECIMAL(10,2)</option>
                          <option value="VARCHAR(255)">VARCHAR(255)</option>
                          <option value="TEXT">TEXT</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                          <option value="DATE">DATE</option>
                          <option value="JSON">JSON</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {columnsList.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                        解析 JSON 后即可看到字段映射。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SQL Output Box */}
          <div className="detail-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", minHeight: "260px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontWeight: "bold", margin: 0 }}>生成的 SQL 语句</h4>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={handleDownload} disabled={!sqlOutput} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px", background: "#f5f5f7", cursor: "pointer" }}>下载 .sql</button>
                <button type="button" onClick={handleCopy} disabled={!sqlOutput} style={{ padding: "4px 8px", fontSize: "12px", color: copySuccess ? "#15803d" : "#fff", border: "1px solid #4f46e5", borderRadius: "4px", background: copySuccess ? "#dcfce7" : "#4f46e5", cursor: "pointer", fontWeight: "600" }}>
                  {copySuccess ? "已复制！" : "复制 SQL"}
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={sqlOutput}
              style={{ width: "100%", flex: 1, fontFamily: "monospace", fontSize: "12px", padding: "10px", backgroundColor: "#f9f9fb", border: "1px solid #e5e7eb", borderRadius: "6px", resize: "none" }}
              placeholder="生成 SQL 结果将显示在此处..."
            />
            {parsedRows.length > 0 && (
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.6 }}>
                成功转换了 {parsedRows.length} 条记录。
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
