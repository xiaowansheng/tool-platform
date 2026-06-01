"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface PdfReport {
  name: string;
  size: number;
  version: string;
  fields: Array<{ key: string; value: string }>;
  xmpPackets: number;
  cleaned: Blob;
}

const metadataFields = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate", "Trapped"];
const decoder = new TextDecoder("windows-1252");

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function decodePdfValue(value: string) {
  if (value.startsWith("(")) {
    return value.slice(1, -1).replace(/\\([nrtbf()\\])/g, (_, escape: string) => {
      const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
      return map[escape] ?? escape;
    });
  }

  return value;
}

function extractFields(text: string) {
  const fields = [];

  for (const key of metadataFields) {
    const pattern = new RegExp(`/${key}\\s*(\\((?:\\\\.|[^\\\\)])*\\)|<[^>\\r\\n]*>)`);
    const match = text.match(pattern);

    if (match) {
      fields.push({ key, value: decodePdfValue(match[1]) });
    }
  }

  return fields;
}

function blankRange(bytes: Uint8Array, start: number, end: number) {
  for (let index = start; index < end; index += 1) {
    bytes[index] = 0x20;
  }
}

function sanitizePdf(buffer: ArrayBuffer, text: string) {
  const bytes = new Uint8Array(buffer.slice(0));
  const fieldPattern = /\/(Title|Author|Subject|Keywords|Creator|Producer|CreationDate|ModDate|Trapped)\s*(\((?:\\.|[^\\)])*\)|<[^>\r\n]*>)/g;
  let match: RegExpExecArray | null;

  while ((match = fieldPattern.exec(text)) !== null) {
    const value = match[2];
    const valueStart = match.index + match[0].lastIndexOf(value);
    blankRange(bytes, valueStart, valueStart + value.length);
  }

  const xmpPattern = /<\?xpacket[\s\S]*?\?>|<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/g;

  while ((match = xmpPattern.exec(text)) !== null) {
    blankRange(bytes, match.index, match.index + match[0].length);
  }

  return new Blob([bytes], { type: "application/pdf" });
}

function inspectPdf(file: File, buffer: ArrayBuffer): PdfReport {
  const text = decoder.decode(buffer);
  const version = text.match(/%PDF-(\d\.\d)/)?.[1] ?? "unknown";
  const fields = extractFields(text);
  const xmpPackets = (text.match(/<x:xmpmeta|<\?xpacket/g) ?? []).length;

  if (!text.startsWith("%PDF-")) {
    throw new Error("不是有效的 PDF 文件头");
  }

  return {
    name: file.name,
    size: file.size,
    version,
    fields,
    xmpPackets,
    cleaned: sanitizePdf(buffer, text)
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PdfMetadataTool({ manifest }: ToolClientProps) {
  const [report, setReport] = useState<PdfReport | null>(null);
  const [error, setError] = useState("");

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      setReport(inspectPdf(file, await file.arrayBuffer()));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "PDF 读取失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文档隐私</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>PDF 文件</span>
          <input type="file" accept="application/pdf,.pdf" onChange={(event) => void loadFile(event)} />
        </label>
        <button type="button" disabled={!report} onClick={() => report ? downloadBlob(report.cleaned, `clean-${report.name}`) : undefined}>
          下载清理版本
        </button>
      </div>
      {report ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>PDF 版本</h3>
              <p>{report.version}</p>
            </article>
            <article className="detail-card">
              <h3>大小</h3>
              <p>{formatBytes(report.size)}</p>
            </article>
            <article className="detail-card">
              <h3>Info 字段</h3>
              <p>{report.fields.length}</p>
            </article>
            <article className="detail-card">
              <h3>XMP 包</h3>
              <p>{report.xmpPackets}</p>
            </article>
          </div>
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>字段</span>
              <span>值</span>
            </div>
            {report.fields.length > 0 ? report.fields.map((field) => (
              <div key={field.key} className="tool-table__row">
                <span>{field.key}</span>
                <span>{field.value || "空"}</span>
              </div>
            )) : (
              <div className="tool-table__row" style={{ gridTemplateColumns: "1fr" }}>
                <span>未发现常见 Info 元数据字段</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <strong>等待 PDF</strong>
          <p>选择 PDF 后显示 Info 字典和 XMP 摘要。</p>
        </div>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
