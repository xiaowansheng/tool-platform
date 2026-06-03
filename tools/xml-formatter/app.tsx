"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Mode = "format" | "minify";

function formatXml(xml: string, indentSize: number): string {
  const pad = " ".repeat(indentSize);
  let formatted = "";
  let depth = 0;

  // Normalize: remove whitespace between tags
  const cleaned = xml.replace(/>\s+</g, "><").trim();
  const tokens = cleaned.match(/<[^>]+>|[^<]+/g) ?? [];

  for (const token of tokens) {
    if (token.startsWith("<?") || token.startsWith("<!")) {
      // Processing instruction or comment
      formatted += pad.repeat(depth) + token + "\n";
    } else if (token.startsWith("</")) {
      // Closing tag
      depth = Math.max(0, depth - 1);
      formatted += pad.repeat(depth) + token + "\n";
    } else if (token.startsWith("<") && token.endsWith("/>")) {
      // Self-closing tag
      formatted += pad.repeat(depth) + token + "\n";
    } else if (token.startsWith("<")) {
      // Opening tag
      formatted += pad.repeat(depth) + token + "\n";
      depth++;
    } else {
      // Text content
      const trimmed = token.trim();
      if (trimmed) {
        formatted += pad.repeat(depth) + trimmed + "\n";
      }
    }
  }

  return formatted.trimEnd();
}

function minifyXml(xml: string): string {
  return xml.replace(/>\s+</g, "><").replace(/\s+/g, " ").replace(/>\s/g, ">").replace(/\s</g, "<").trim();
}

function validateXml(xml: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
      return errorNode.textContent ?? "XML 解析错误";
    }
    return null;
  } catch {
    return "XML 解析失败";
  }
}

export default function XmlFormatterTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<Mode>("format");
  const [indentSize, setIndentSize] = useState(2);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetOutput() {
    setOutput("");
    setError("");
    setValidationError(null);
    setCopied(false);
  }

  function handleProcess() {
    try {
      if (!input.trim()) throw new Error("请输入 XML 内容");

      const valErr = validateXml(input);
      setValidationError(valErr);

      if (valErr) {
        setOutput("");
        return;
      }

      if (mode === "format") {
        setOutput(formatXml(input, indentSize));
      } else {
        setOutput(minifyXml(input));
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "处理失败");
      setOutput("");
    }
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">XML 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>操作模式</span>
          <select value={mode} onChange={(e) => { setMode(e.target.value as Mode); resetOutput(); }}>
            <option value="format">格式化（美化）</option>
            <option value="minify">压缩（Minify）</option>
          </select>
        </label>
        {mode === "format" ? (
          <label className="tool-field tool-field--compact">
            <span>缩进空格</span>
            <select value={indentSize} onChange={(e) => { setIndentSize(Number(e.target.value)); resetOutput(); }}>
              <option value={2}>2 空格</option>
              <option value={4}>4 空格</option>
              <option value={8}>Tab (8 空格)</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>XML 输入</span>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); resetOutput(); }}
            spellCheck={false}
            placeholder={"<root>\n  <item id=\"1\">Hello</item>\n</root>"}
          />
        </label>
        <label className="tool-field">
          <span>{mode === "format" ? "格式化输出" : "压缩输出"}</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={handleProcess}>
          {mode === "format" ? "格式化" : "压缩"}
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      {validationError ? <p className="tool-error">校验失败：{validationError}</p> : null}
      {!validationError && input.trim() && !error ? (
        <p className="tool-note" style={{ color: "var(--color-success, #22c55e)" }}>XML 校验通过</p>
      ) : null}
      <p className="tool-note">使用浏览器内置 DOMParser 校验 XML，格式化采用标签感知缩进算法。所有操作在本地完成。</p>
    </section>
  );
}
