"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface DiagramIssue {
  line: number;
  message: string;
}

interface PreviewNode {
  id: string;
  label: string;
  shape: "rect" | "diamond";
}

interface PreviewEdge {
  from: string;
  to: string;
  label: string;
  dashed: boolean;
}

const sampleMermaid = `flowchart TD
  Start([Start]) --> Validate{Valid?}
  Validate -->|yes| Build[Build docs]
  Validate -->|no| Fix[Fix Mermaid]
  Fix --> Validate
  Build --> Ship([Ship])`;

function stripMermaidFence(input: string) {
  return input
    .replace(/^```mermaid\s*/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function normalizeMermaidLine(line: string) {
  return line
    .trim()
    .replace(/\s*(-->|---|==>|-.->)\s*/g, " $1 ")
    .replace(/\s*\|\s*/g, "|")
    .replace(/\s{2,}/g, " ");
}

function formatMermaid(input: string) {
  const source = stripMermaidFence(input);

  return source
    .split(/\r?\n/)
    .map((line, index) => {
      const normalized = normalizeMermaidLine(line);

      if (normalized === "") {
        return "";
      }

      if (index === 0 || /^%%/.test(normalized) || /^end$/i.test(normalized)) {
        return normalized;
      }

      return `  ${normalized}`;
    })
    .join("\n")
    .trim();
}

function lintMermaid(input: string) {
  const source = stripMermaidFence(input);
  const lines = source.split(/\r?\n/);
  const firstMeaningfulLine = lines.find((line) => line.trim() && !line.trim().startsWith("%%")) ?? "";
  const issues: DiagramIssue[] = [];

  if (!/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline)\b/i.test(firstMeaningfulLine.trim())) {
    issues.push({ line: 1, message: "缺少 Mermaid 图表声明，例如 flowchart TD 或 sequenceDiagram。" });
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("%%")) {
      return;
    }

    const squareBalance = (trimmed.match(/\[/g) ?? []).length - (trimmed.match(/\]/g) ?? []).length;
    const braceBalance = (trimmed.match(/\{/g) ?? []).length - (trimmed.match(/\}/g) ?? []).length;
    const pipeBalance = (trimmed.match(/\|/g) ?? []).length % 2;

    if (squareBalance !== 0 || braceBalance !== 0) {
      issues.push({ line: index + 1, message: "节点标签括号不成对。" });
    }

    if (pipeBalance !== 0) {
      issues.push({ line: index + 1, message: "边标签的 | 分隔符不成对。" });
    }

    if (/(-->|---|==>|-.->)\s*$/.test(trimmed)) {
      issues.push({ line: index + 1, message: "边缺少目标节点。" });
    }
  });

  return issues;
}

function parseEndpoint(rawValue: string): PreviewNode {
  const raw = rawValue.trim().replace(/:::[\w-]+$/, "");
  const id = raw.match(/^([A-Za-z0-9_:-]+)/)?.[1] ?? raw;
  const labelMatch = raw.match(/\[([^\]]+)\]|\{([^}]+)\}|\(([^)]+)\)/);
  const label = (labelMatch?.[1] ?? labelMatch?.[2] ?? labelMatch?.[3] ?? id)
    .replace(/^\[|\]$/g, "")
    .trim();

  return {
    id,
    label,
    shape: raw.includes("{") ? "diamond" : "rect"
  };
}

function parseFlowchart(input: string) {
  const source = stripMermaidFence(input);
  const nodes = new Map<string, PreviewNode>();
  const edges: PreviewEdge[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || /^(flowchart|graph|subgraph|end|classDef|class|style|linkStyle)\b/i.test(line)) {
      continue;
    }

    const edgeMatch = line.match(/^(.+?)\s*(-->|---|==>|-.->)(?:\|([^|]+)\|)?\s*(.+)$/);

    if (!edgeMatch) {
      const node = parseEndpoint(line);
      nodes.set(node.id, node);
      continue;
    }

    const from = parseEndpoint(edgeMatch[1] ?? "");
    const to = parseEndpoint(edgeMatch[4] ?? "");

    nodes.set(from.id, from);
    nodes.set(to.id, to);
    edges.push({
      from: from.id,
      to: to.id,
      label: edgeMatch[3]?.trim() ?? "",
      dashed: edgeMatch[2] === "-.->"
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}

function MermaidPreview({ source }: { source: string }) {
  const diagram = parseFlowchart(source);

  if (diagram.nodes.length === 0) {
    return (
      <div className="detail-card">
        <h3>预览</h3>
        <p>当前轻量预览支持 flowchart / graph 的节点与箭头。</p>
      </div>
    );
  }

  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(diagram.nodes.length))));
  const width = columns * 220 + 40;
  const rows = Math.ceil(diagram.nodes.length / columns);
  const height = rows * 120 + 80;
  const positions = new Map(
    diagram.nodes.map((node, index) => [
      node.id,
      {
        x: 120 + (index % columns) * 220,
        y: 70 + Math.floor(index / columns) * 120
      }
    ])
  );

  return (
    <div className="detail-card" aria-label="Mermaid 轻量预览">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" style={{ width: "100%", minHeight: "18rem" }}>
        <defs>
          <marker id="mermaid-preview-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="var(--accent-primary)" />
          </marker>
        </defs>
        {diagram.edges.map((edge, index) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);

          if (!from || !to) {
            return null;
          }

          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--accent-primary)"
                strokeWidth="2"
                strokeDasharray={edge.dashed ? "6 6" : undefined}
                markerEnd="url(#mermaid-preview-arrow)"
              />
              {edge.label ? (
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
                  {edge.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {diagram.nodes.map((node) => {
          const position = positions.get(node.id) ?? { x: 0, y: 0 };

          if (node.shape === "diamond") {
            return (
              <g key={node.id}>
                <polygon
                  points={`${position.x},${position.y - 42} ${position.x + 80},${position.y} ${position.x},${position.y + 42} ${position.x - 80},${position.y}`}
                  fill="var(--bg-subtle)"
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                />
                <text x={position.x} y={position.y + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="13">
                  {node.label}
                </text>
              </g>
            );
          }

          return (
            <g key={node.id}>
              <rect x={position.x - 78} y={position.y - 26} width="156" height="52" rx="10" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeWidth="1.5" />
              <text x={position.x} y={position.y + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="13">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function MermaidPreviewFormatterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleMermaid);
  const [copied, setCopied] = useState(false);
  const output = formatMermaid(input);
  const issues = lintMermaid(output);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文档工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => setInput(output)}>应用格式化</button>
        <button type="button" onClick={() => void copyOutput()}>{copied ? "已复制" : "复制格式化结果"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Mermaid</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>格式化结果</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="workspace workspace--two-column">
        <MermaidPreview source={output} />
        <div className="tool-table">
          <div className="tool-table__row tool-table__row--head">
            <span>行号</span>
            <span>检查项</span>
          </div>
          {issues.length > 0 ? issues.map((issue) => (
            <div className="tool-table__row" key={`${issue.line}-${issue.message}`}>
              <span>{issue.line}</span>
              <span>{issue.message}</span>
            </div>
          )) : (
            <div className="tool-table__row">
              <span>通过</span>
              <span>未发现基础语法问题</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
