"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

import YamlJsonTomlConverterTab from "./components/yaml-json-toml";
import CsvJsonNdjsonConverterTab from "./components/csv-json-ndjson";
import JsonToTsTab from "./components/json-to-ts";
import JsonToGoTab from "./components/json-to-go";
import JsonToSqlTab from "./components/json-to-sql";
import SqlToGoTab from "./components/sql-to-go";
import SvgToJsxTab from "./components/svg-to-jsx";
import MarkdownHtmlConverterTab from "./components/markdown-html";
import HtaccessToNginxTab from "./components/htaccess-to-nginx";

type ConverterStudioTab =
  | "yaml-json-toml"
  | "csv-json-ndjson"
  | "json-to-ts"
  | "json-to-go"
  | "json-to-sql"
  | "sql-to-go"
  | "svg-to-jsx"
  | "markdown-html"
  | "htaccess-to-nginx";

const DEFAULT_INPUT = `{
  "id": "converter-studio",
  "name": "Converter Studio",
  "featured": true,
  "tags": ["convert", "json", "yaml"],
  "meta": {
    "runtime": "simple",
    "version": 1
  }
}`;

export default function ConverterStudioTool({ manifest }: ToolAppProps) {
  const [inputText, setInputText] = useState(DEFAULT_INPUT);
  const [activeTab, setActiveTab] = useState<ConverterStudioTab>("yaml-json-toml");

  const tabs: Array<{ id: ConverterStudioTab; label: string }> = [
    { id: "yaml-json-toml", label: "YAML/JSON/TOML" },
    { id: "csv-json-ndjson", label: "CSV/JSON/NDJSON" },
    { id: "json-to-ts", label: "JSON 转 TS" },
    { id: "json-to-go", label: "JSON 转 Go" },
    { id: "json-to-sql", label: "JSON 转 SQL" },
    { id: "sql-to-go", label: "SQL 转 Go" },
    { id: "svg-to-jsx", label: "SVG 转 JSX" },
    { id: "markdown-html", label: "MD 互转 HTML" },
    { id: "htaccess-to-nginx", label: "htaccess 转 Nginx" }
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">开发工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Shared Input Preview Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        background: "var(--bg-muted)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "10px 16px",
        marginBottom: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
          <span style={{ fontSize: "1.2rem" }}>🔄</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>输入缓存状态:</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {inputText.trim() ? `${inputText.trim().substring(0, 60)}${inputText.trim().length > 60 ? "..." : ""}` : "(无内容)"}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>({inputText.length} 字符)</span>
        </div>
        {inputText && (
          <button 
            type="button" 
            className="button--danger" 
            style={{ padding: "4px 8px", fontSize: "0.75rem", whiteSpace: "nowrap" }} 
            onClick={() => setInputText("")}
          >
            清空输入
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="segmented-control" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "24px", background: "none", padding: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 500,
              flex: "1 0 auto",
              textAlign: "center"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="studio-tab-content" style={{ minHeight: "350px" }}>
        {activeTab === "yaml-json-toml" && (
          <YamlJsonTomlConverterTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "csv-json-ndjson" && (
          <CsvJsonNdjsonConverterTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "json-to-ts" && (
          <JsonToTsTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "json-to-go" && (
          <JsonToGoTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "json-to-sql" && (
          <JsonToSqlTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "sql-to-go" && (
          <SqlToGoTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "svg-to-jsx" && (
          <SvgToJsxTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "markdown-html" && (
          <MarkdownHtmlConverterTab inputText={inputText} onChangeInputText={setInputText} />
        )}
        {activeTab === "htaccess-to-nginx" && (
          <HtaccessToNginxTab inputText={inputText} onChangeInputText={setInputText} />
        )}
      </div>
    </section>
  );
}
