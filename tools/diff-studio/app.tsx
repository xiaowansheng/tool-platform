"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

import TextDiffTab from "./components/text-diff";
import JsonDiffTab from "./components/json-diff";
import EnvDiffTab from "./components/env-diff";
import HelmDiffTab from "./components/helm-diff";

type DiffStudioTab = "text" | "json" | "env" | "helm";

const DEFAULT_LEFT = `// 欢迎来到 Diff Studio!
// 您可以在此处输入任何文本、代码或配置文件。
name: Tool Platform
version: 1.0.0
enabled: true`;

const DEFAULT_RIGHT = `// 欢迎来到 Diff Studio!
// 您可以在此处输入任何文本、代码或配置文件。
name: Tool Platform
version: 1.1.0
enabled: true
tags: [dev]`;

export default function DiffStudioTool({ manifest }: ToolAppProps) {
  const [leftText, setLeftText] = useState(DEFAULT_LEFT);
  const [rightText, setRightText] = useState(DEFAULT_RIGHT);
  const [activeTab, setActiveTab] = useState<DiffStudioTab>("text");

  const tabs: Array<{ id: DiffStudioTab; label: string }> = [
    { id: "text", label: "文本对比 (LCS)" },
    { id: "json", label: "JSON 结构对比" },
    { id: "env", label: ".env 差异合并" },
    { id: "helm", label: "Helm values 对比" }
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">开发与运维</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Shared State Preview Bar */}
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
          <span style={{ fontSize: "1.2rem" }}>⚖️</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>活跃对比缓存:</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            左侧 ({leftText.length} 字符) ↔ 右侧 ({rightText.length} 字符)
          </span>
        </div>
        {(leftText || rightText) && (
          <button 
            type="button" 
            className="button--danger" 
            style={{ padding: "4px 8px", fontSize: "0.75rem", whiteSpace: "nowrap" }} 
            onClick={() => {
              setLeftText("");
              setRightText("");
            }}
          >
            清空全部
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
        {activeTab === "text" && (
          <TextDiffTab
            leftText={leftText}
            onChangeLeftText={setLeftText}
            rightText={rightText}
            onChangeRightText={setRightText}
          />
        )}
        {activeTab === "json" && (
          <JsonDiffTab
            leftText={leftText}
            onChangeLeftText={setLeftText}
            rightText={rightText}
            onChangeRightText={setRightText}
          />
        )}
        {activeTab === "env" && (
          <EnvDiffTab
            leftText={leftText}
            onChangeLeftText={setLeftText}
            rightText={rightText}
            onChangeRightText={setRightText}
          />
        )}
        {activeTab === "helm" && (
          <HelmDiffTab
            leftText={leftText}
            onChangeLeftText={setLeftText}
            rightText={rightText}
            onChangeRightText={setRightText}
          />
        )}
      </div>
    </section>
  );
}
