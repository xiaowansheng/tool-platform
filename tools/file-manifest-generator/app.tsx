"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleInput = `src/
  components/
    Button.tsx
    Input.tsx
    Modal.tsx
  utils/
    format.ts
    validate.ts
  index.ts
  types.ts
package.json
tsconfig.json`;

interface FileNode {
  name: string;
  type: "file" | "directory";
  children: FileNode[];
}

function parseDirectoryTree(text: string): FileNode[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const root: FileNode[] = [];
  const stack: { indent: number; node: FileNode }[] = [];

  for (const line of lines) {
    const indent = line.search(/\S/);
    const name = line.trim().replace(/\/$/, "");
    const isDir = line.trim().endsWith("/");

    const node: FileNode = {
      name,
      type: isDir ? "directory" : "file",
      children: []
    };

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1]!.node.children.push(node);
    }

    if (isDir) {
      stack.push({ indent, node });
    }
  }

  return root;
}

function nodesToJson(nodes: FileNode[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const node of nodes) {
    if (node.type === "directory") {
      result[node.name + "/"] = nodesToJson(node.children);
    } else {
      result[node.name] = null;
    }
  }
  return result;
}

function nodesToYaml(nodes: FileNode[], indent = 0): string {
  const prefix = "  ".repeat(indent);
  return nodes
    .map((node) => {
      if (node.type === "directory") {
        return `${prefix}${node.name}/:\n${nodesToYaml(node.children, indent + 1)}`;
      }
      return `${prefix}- ${node.name}`;
    })
    .join("\n");
}

function nodesToMarkdown(nodes: FileNode[], indent = 0): string {
  const prefix = "  ".repeat(indent);
  return nodes
    .map((node) => {
      if (node.type === "directory") {
        return `${prefix}- 📁 ${node.name}/\n${nodesToMarkdown(node.children, indent + 1)}`;
      }
      return `${prefix}- 📄 ${node.name}`;
    })
    .join("\n");
}

type OutputFormat = "json" | "yaml" | "markdown";

function countNodes(nodes: FileNode[]): { files: number; dirs: number } {
  let files = 0;
  let dirs = 0;
  for (const node of nodes) {
    if (node.type === "directory") {
      dirs++;
      const sub = countNodes(node.children);
      files += sub.files;
      dirs += sub.dirs;
    } else {
      files++;
    }
  }
  return { files, dirs };
}

export default function FileManifestGeneratorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleInput);
  const [format, setFormat] = useState<OutputFormat>("json");
  const [copied, setCopied] = useState(false);

  const tree = useMemo(() => parseDirectoryTree(input), [input]);
  const { files, dirs } = useMemo(() => countNodes(tree), [tree]);

  const output = useMemo(() => {
    if (tree.length === 0) return "";
    switch (format) {
      case "json":
        return JSON.stringify(nodesToJson(tree), null, 2);
      case "yaml":
        return nodesToYaml(tree);
      case "markdown":
        return nodesToMarkdown(tree);
    }
  }, [tree, format]);

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">项目结构</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>输出格式</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="markdown">Markdown</option>
          </select>
        </label>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制结果"}
        </button>
        <button type="button" onClick={() => { setInput(sampleInput); setCopied(false); }}>重置示例</button>
        <button type="button" onClick={() => { setInput(""); setCopied(false); }}>清空</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>文件数</h3>
          <p>{files}</p>
        </article>
        <article className="detail-card">
          <h3>目录数</h3>
          <p>{dirs}</p>
        </article>
        <article className="detail-card">
          <h3>输出格式</h3>
          <p>{format.toUpperCase()}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>目录结构（缩进表示层级，/ 结尾表示目录）</span>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setCopied(false); }}
            spellCheck={false}
            rows={16}
            placeholder="输入目录结构文本…"
          />
        </label>
        <label className="tool-field">
          <span>清单输出</span>
          <textarea value={output} readOnly spellCheck={false} rows={16} className="mono-output" />
        </label>
      </div>

      <p className="tool-note">
        使用缩进（2 空格）表示层级，以 / 结尾的名称识别为目录。
        适合生成项目结构文档和配置文件清单。
      </p>
    </section>
  );
}
