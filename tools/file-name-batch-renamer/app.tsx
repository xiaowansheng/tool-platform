"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type CaseMode = "slug" | "snake" | "camel" | "title";

const sampleFiles = `Product Photo 01.JPG
Product Photo 02.JPG
Summer Campaign Final.png
README Draft.md`;

function splitName(filename: string) {
  const dotIndex = filename.lastIndexOf(".");

  if (dotIndex <= 0) {
    return { base: filename, extension: "" };
  }

  return {
    base: filename.slice(0, dotIndex),
    extension: filename.slice(dotIndex)
  };
}

function words(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

function formatBase(value: string, mode: CaseMode, separator: string) {
  const parts = words(value);

  if (mode === "camel") {
    return parts.map((part, index) => index === 0 ? part.toLowerCase() : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`).join("");
  }

  if (mode === "title") {
    return parts.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`).join(separator);
  }

  return parts.map((part) => part.toLowerCase()).join(mode === "snake" ? "_" : separator);
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export default function FileNameBatchRenamerTool({ manifest }: ToolAppProps) {
  const [filesText, setFilesText] = useState(sampleFiles);
  const [prefix, setPrefix] = useState("shop");
  const [suffix, setSuffix] = useState("");
  const [separator, setSeparator] = useState("-");
  const [caseMode, setCaseMode] = useState<CaseMode>("slug");
  const [start, setStart] = useState(1);
  const [pad, setPad] = useState(2);
  const [keepExtension, setKeepExtension] = useState(true);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const mappings = useMemo(() => filesText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((original, index) => {
      const { base, extension } = splitName(original);
      const number = String(start + index).padStart(Math.max(1, pad), "0");
      const cleanBase = formatBase(base, caseMode, separator);
      const nextBase = [prefix, cleanBase, suffix, number].filter(Boolean).join(separator);

      return {
        original,
        renamed: `${nextBase}${keepExtension ? extension.toLowerCase() : ""}`
      };
    }), [caseMode, filesText, keepExtension, pad, prefix, separator, start, suffix]);
  const preview = mappings.map((item) => `${item.original} -> ${item.renamed}`).join("\n");
  const script = mappings.map((item) => `mv -n -- ${shellQuote(item.original)} ${shellQuote(item.renamed)}`).join("\n");

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">批量重命名</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>前缀</span><input value={prefix} onChange={(event) => setPrefix(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>后缀</span><input value={suffix} onChange={(event) => setSuffix(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>分隔符</span><input value={separator} maxLength={3} onChange={(event) => setSeparator(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>大小写</span><select value={caseMode} onChange={(event) => setCaseMode(event.target.value as CaseMode)}><option value="slug">slug</option><option value="snake">snake</option><option value="camel">camel</option><option value="title">title</option></select></label>
        <label className="tool-field tool-field--compact"><span>起始序号</span><input type="number" min="0" value={start} onChange={(event) => setStart(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>序号位数</span><input type="number" min="1" max="8" value={pad} onChange={(event) => setPad(Number(event.target.value))} /></label>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => setKeepExtension((value) => !value)}>{keepExtension ? "保留扩展名" : "移除扩展名"}</button>
        <button type="button" onClick={() => void copy("preview", preview)}>{copied === "preview" ? "已复制" : "复制预览"}</button>
        <button type="button" onClick={() => void copy("script", script)}>{copied === "script" ? "已复制" : "复制命令"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>文件数</h3><p>{mappings.length}</p></article>
        <article className="detail-card"><h3>命名风格</h3><p>{caseMode}</p></article>
        <article className="detail-card"><h3>扩展名</h3><p>{keepExtension ? "保留" : "移除"}</p></article>
        <article className="detail-card"><h3>示例</h3><p>{mappings[0]?.renamed ?? "-"}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>原文件名，每行一个</span>
          <textarea value={filesText} onChange={(event) => {
            setFilesText(event.target.value);
            setCopied("");
          }} />
        </label>
        <label className="tool-field">
          <span>预览与 dry-run 命令</span>
          <textarea value={`${preview}\n\n# Shell 命令\n${script}`} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">工具只生成预览和命令，不会访问本地文件系统；执行 shell 命令前请先在测试目录确认。</p>
    </section>
  );
}
