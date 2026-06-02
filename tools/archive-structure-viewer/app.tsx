"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ArchiveEntry {
  path: string;
  type: string;
  size: number;
  compressedSize?: number;
  method?: string;
}

interface ArchiveReport {
  format: string;
  entries: ArchiveEntry[];
  directories: number;
  files: number;
  totalSize: number;
}

const decoder = new TextDecoder();

function readString(bytes: Uint8Array, start: number, length: number) {
  const slice = bytes.slice(start, start + length);
  const end = slice.indexOf(0);
  return decoder.decode(end >= 0 ? slice.slice(0, end) : slice).trim();
}

function readOctal(bytes: Uint8Array, start: number, length: number) {
  const raw = readString(bytes, start, length).replace(/\0/g, "").trim();
  return Number.parseInt(raw || "0", 8) || 0;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function parseZip(buffer: ArrayBuffer): ArchiveReport | null {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const minEocdOffset = Math.max(0, bytes.length - 65557);
  let eocd = -1;

  for (let offset = bytes.length - 22; offset >= minEocdOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }

  if (eocd === -1) {
    return null;
  }

  const totalEntries = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ArchiveEntry[] = [];

  for (let index = 0; index < totalEntries && offset + 46 <= bytes.length; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      break;
    }

    const methodCode = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const path = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));

    entries.push({
      path,
      type: path.endsWith("/") ? "directory" : "file",
      size,
      compressedSize,
      method: methodCode === 0 ? "store" : methodCode === 8 ? "deflate" : `method ${methodCode}`
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return summarize("ZIP", entries);
}

function parseTar(buffer: ArrayBuffer): ArchiveReport | null {
  const bytes = new Uint8Array(buffer);
  const entries: ArchiveEntry[] = [];

  for (let offset = 0; offset + 512 <= bytes.length;) {
    const block = bytes.slice(offset, offset + 512);

    if (block.every((byte) => byte === 0)) {
      break;
    }

    const name = readString(bytes, offset, 100);
    const prefix = readString(bytes, offset + 345, 155);
    const path = [prefix, name].filter(Boolean).join("/");
    const size = readOctal(bytes, offset + 124, 12);
    const typeflag = String.fromCharCode(bytes[offset + 156] || 48);

    if (!path) {
      return null;
    }

    entries.push({
      path,
      type: typeflag === "5" || path.endsWith("/") ? "directory" : "file",
      size,
      method: "tar"
    });
    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return entries.length > 0 ? summarize("TAR", entries) : null;
}

function summarize(format: string, entries: ArchiveEntry[]): ArchiveReport {
  return {
    format,
    entries,
    directories: entries.filter((entry) => entry.type === "directory").length,
    files: entries.filter((entry) => entry.type !== "directory").length,
    totalSize: entries.reduce((sum, entry) => sum + entry.size, 0)
  };
}

function depth(path: string) {
  return path.split("/").filter(Boolean).length;
}

export default function ArchiveStructureViewerTool({ manifest }: ToolAppProps) {
  const [report, setReport] = useState<ArchiveReport | null>(null);
  const [error, setError] = useState("");

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseZip(buffer) ?? parseTar(buffer);

      if (!parsed) {
        throw new Error("无法识别 ZIP 或 TAR 目录结构");
      }

      setReport(parsed);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "归档读取失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">归档索引</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>ZIP / TAR 文件</span>
          <input type="file" accept=".zip,.tar,application/zip,application/x-tar" onChange={(event) => void loadFile(event)} />
        </label>
      </div>
      {report ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>格式</h3>
              <p>{report.format}</p>
            </article>
            <article className="detail-card">
              <h3>文件</h3>
              <p>{report.files}</p>
            </article>
            <article className="detail-card">
              <h3>目录</h3>
              <p>{report.directories}</p>
            </article>
            <article className="detail-card">
              <h3>原始大小</h3>
              <p>{formatBytes(report.totalSize)}</p>
            </article>
          </div>
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "minmax(16rem, 1fr) 7rem 8rem 8rem" }}>
              <span>路径</span>
              <span>类型</span>
              <span>大小</span>
              <span>方法</span>
            </div>
            {report.entries.slice(0, 160).map((entry) => (
              <div key={entry.path} className="tool-table__row" style={{ gridTemplateColumns: "minmax(16rem, 1fr) 7rem 8rem 8rem" }}>
                <span className="mono-output" style={{ paddingLeft: `${Math.max(0, depth(entry.path) - 1) * 0.75}rem` }}>{entry.path}</span>
                <span>{entry.type}</span>
                <span>{formatBytes(entry.size)}</span>
                <span>{entry.method ?? "无"}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <strong>等待归档文件</strong>
          <p>选择 ZIP 或 TAR 后展示目录结构。</p>
        </div>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
