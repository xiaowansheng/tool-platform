"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// --- PDF Editor Types & Utilities ---
interface PdfObject {
  oldId: number;
  generation: number;
  body: string;
  kind: "catalog" | "pages" | "page" | "other";
}

interface PdfSource {
  fileName: string;
  size: number;
  sourceIndex: number;
  version: string;
  objects: PdfObject[];
  pageIds: number[];
  warnings: string[];
}

interface PageRef {
  source: PdfSource;
  oldId: number;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const textEncoder = new TextEncoder();

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function safeName(value: string) {
  return value.replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "document";
}

function bytesToBinaryString(bytes: Uint8Array) {
  let output = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return output;
}

function bufferToBinaryString(buffer: ArrayBuffer) {
  return bytesToBinaryString(new Uint8Array(buffer));
}

function binaryStringToBytes(input: string) {
  const bytes = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    bytes[index] = input.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function detectKind(body: string): PdfObject["kind"] {
  if (/\/Type\s*\/Catalog\b/.test(body)) return "catalog";
  if (/\/Type\s*\/Pages\b/.test(body)) return "pages";
  if (/\/Type\s*\/Page\b/.test(body)) return "page";
  return "other";
}

function parsePdfSource(file: File, buffer: ArrayBuffer, sourceIndex: number): PdfSource {
  const text = bufferToBinaryString(buffer);
  const version = text.match(/^%PDF-(\d\.\d)/)?.[1];

  if (!version) {
    throw new Error(`${file.name} 不是有效的 PDF 文件头`);
  }

  const objects: PdfObject[] = [];
  const objectPattern = /(\d+)\s+(\d+)\s+obj\b([\s\S]*?)\bendobj/g;
  let match: RegExpExecArray | null;

  while ((match = objectPattern.exec(text)) !== null) {
    const body = match[3].replace(/^\s+|\s+$/g, "");
    objects.push({
      oldId: Number(match[1]),
      generation: Number(match[2]),
      body,
      kind: detectKind(body)
    });
  }

  const pageIds = objects.filter((object) => object.kind === "page").map((object) => object.oldId);
  const warnings: string[] = [];

  if (/\/ObjStm\b/.test(text)) {
    warnings.push("检测到压缩对象流，部分复杂 PDF 可能需要专业 PDF 引擎处理。");
  }

  if (pageIds.length === 0) {
    throw new Error(`${file.name} 未发现可拆分的 Page 对象`);
  }

  return {
    fileName: file.name,
    size: file.size,
    sourceIndex,
    version,
    objects,
    pageIds,
    warnings
  };
}

function replaceReferences(body: string, idMap: Map<number, number>) {
  return body.replace(/\b(\d+)\s+(\d+)\s+R\b/g, (reference, rawId: string) => {
    const nextId = idMap.get(Number(rawId));
    return nextId ? `${nextId} 0 R` : reference;
  });
}

function ensurePageParent(body: string) {
  if (/\/Parent\s+\d+\s+\d+\s+R\b/.test(body)) {
    return body.replace(/\/Parent\s+\d+\s+\d+\s+R\b/, "/Parent 2 0 R");
  }
  return body.replace(/<<\s*/, "<< /Parent 2 0 R ");
}

function buildPdf(sources: PdfSource[], pages: PageRef[]) {
  const pageKeys = new Set(pages.map((page) => `${page.source.sourceIndex}:${page.oldId}`));
  const copied: Array<{ newId: number; oldId: number; body: string; kind: PdfObject["kind"]; sourceIndex: number }> = [];
  const idMaps = new Map<number, Map<number, number>>();
  let nextId = 3;

  for (const source of sources) {
    const idMap = new Map<number, Map<number, number>>().get(source.sourceIndex) ?? new Map<number, number>();
    idMaps.set(source.sourceIndex, idMap);

    for (const object of source.objects) {
      if (object.kind === "catalog") {
        idMap.set(object.oldId, 1);
        continue;
      }
      if (object.kind === "pages") {
        idMap.set(object.oldId, 2);
        continue;
      }
      if (object.kind === "page" && !pageKeys.has(`${source.sourceIndex}:${object.oldId}`)) {
        continue;
      }
      idMap.set(object.oldId, nextId);
      copied.push({
        newId: nextId,
        oldId: object.oldId,
        body: object.body,
        kind: object.kind,
        sourceIndex: source.sourceIndex
      });
      nextId += 1;
    }
  }

  const selectedPageIds = copied
    .filter((object) => object.kind === "page")
    .map((object) => object.newId);
  const pageKids = selectedPageIds.map((id) => `${id} 0 R`).join(" ");
  const chunks: string[] = [];
  const offsets: number[] = [0];
  let offset = 0;

  function push(chunk: string) {
    chunks.push(chunk);
    offset += chunk.length;
  }

  function writeObject(id: number, body: string) {
    offsets[id] = offset;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  }

  push("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");
  writeObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  writeObject(2, `<< /Type /Pages /Count ${selectedPageIds.length} /Kids [ ${pageKids} ] >>`);

  for (const object of copied) {
    const idMap = idMaps.get(object.sourceIndex) ?? new Map<number, number>();
    const remapped = replaceReferences(object.body, idMap);
    writeObject(object.newId, object.kind === "page" ? ensurePageParent(remapped) : remapped);
  }

  const xrefOffset = offset;
  const size = nextId;

  push(`xref\n0 ${size}\n`);
  push("0000000000 65535 f \n");

  for (let id = 1; id < size; id += 1) {
    push(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`);
  }

  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return new Blob([binaryStringToBytes(chunks.join(""))], { type: "application/pdf" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function le16(value: number) {
  return String.fromCharCode(value & 0xff, (value >>> 8) & 0xff);
}

function le32(value: number) {
  return String.fromCharCode(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function zipTimestamp() {
  const now = new Date();
  const year = Math.max(1980, now.getFullYear());
  return {
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  };
}

function makeZip(entries: ZipEntry[]) {
  const localParts: string[] = [];
  const centralParts: string[] = [];
  const timestamp = zipTimestamp();
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const name = bytesToBinaryString(nameBytes);
    const data = bytesToBinaryString(entry.data);
    const crc = crc32(entry.data);
    const localOffset = offset;
    const flags = 0x0800;
    const localHeader = [
      le32(0x04034b50),
      le16(20),
      le16(flags),
      le16(0),
      le16(timestamp.time),
      le16(timestamp.date),
      le32(crc),
      le32(entry.data.length),
      le32(entry.data.length),
      le16(nameBytes.length),
      le16(0)
    ].join("");
    const centralHeader = [
      le32(0x02014b50),
      le16(20),
      le16(20),
      le16(flags),
      le16(0),
      le16(timestamp.time),
      le16(timestamp.date),
      le32(crc),
      le32(entry.data.length),
      le32(entry.data.length),
      le16(nameBytes.length),
      le16(0),
      le16(0),
      le16(0),
      le16(0),
      le32(0),
      le32(localOffset)
    ].join("");

    localParts.push(localHeader, name, data);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  }

  const centralOffset = offset;
  const central = centralParts.join("");
  const end = [
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(entries.length),
    le16(entries.length),
    le32(central.length),
    le32(centralOffset),
    le16(0)
  ].join("");

  return new Blob([binaryStringToBytes(localParts.join("") + central + end)], { type: "application/zip" });
}

// --- PDF Metadata Viewer Definitions ---
interface PdfReport {
  name: string;
  size: number;
  version: string;
  fields: Array<{ key: string; value: string }>;
  xmpPackets: number;
  cleaned: Blob;
}

const metadataFields = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate", "Trapped"];
const windowsDecoder = new TextDecoder("windows-1252");

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
  const text = windowsDecoder.decode(buffer);
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

// --- Main Tool Component ---
export default function PdfToolsTool({ manifest }: ToolAppProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "metadata">("editor");

  // --- Tab 1: PDF Editor States ---
  const [sources, setSources] = useState<PdfSource[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const activeSource = sources[activeIndex] ?? sources[0] ?? null;
  const totals = useMemo(() => ({
    pages: sources.reduce((sum, source) => sum + source.pageIds.length, 0),
    objects: sources.reduce((sum, source) => sum + source.objects.length, 0),
    bytes: sources.reduce((sum, source) => sum + source.size, 0)
  }), [sources]);

  async function loadFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length === 0) return;

    try {
      const parsed = await Promise.all(files.map(async (file, index) =>
        parsePdfSource(file, await file.arrayBuffer(), index)
      ));

      setSources(parsed);
      setActiveIndex(0);
      setError("");
      setMessage(`已加载 ${parsed.length} 个 PDF，共 ${parsed.reduce((sum, source) => sum + source.pageIds.length, 0)} 页。`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "PDF 读取失败");
    }
  }

  async function mergeFiles() {
    if (sources.length === 0) {
      setError("请先选择 PDF 文件");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const pages = sources.flatMap((source) => source.pageIds.map((oldId) => ({ source, oldId })));
      const blob = buildPdf(sources, pages);
      downloadBlob(blob, "merged.pdf");
      setMessage(`已合并 ${sources.length} 个文件，输出 ${pages.length} 页，大小 ${formatBytes(blob.size)}。`);
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : "PDF 合并失败");
    } finally {
      setBusy(false);
    }
  }

  async function splitActiveFile() {
    if (!activeSource) {
      setError("请先选择 PDF 文件");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const entries: ZipEntry[] = [];
      for (let index = 0; index < activeSource.pageIds.length; index += 1) {
        const oldId = activeSource.pageIds[index];
        const blob = buildPdf([activeSource], [{ source: activeSource, oldId }]);
        entries.push({
          name: `${safeName(activeSource.fileName)}-page-${String(index + 1).padStart(3, "0")}.pdf`,
          data: new Uint8Array(await blob.arrayBuffer())
        });
      }

      const zip = makeZip(entries);
      downloadBlob(zip, `${safeName(activeSource.fileName)}-split.zip`);
      setMessage(`已拆分 ${activeSource.fileName} 为 ${entries.length} 个单页 PDF。`);
    } catch (splitError) {
      setError(splitError instanceof Error ? splitError.message : "PDF 拆分失败");
    } finally {
      setBusy(false);
    }
  }

  async function compactActiveFile() {
    if (!activeSource) {
      setError("请先选择 PDF 文件");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const pages = activeSource.pageIds.map((oldId) => ({ source: activeSource, oldId }));
      const blob = buildPdf([activeSource], pages);
      const saved = activeSource.size > 0 ? Math.max(0, Math.round((1 - blob.size / activeSource.size) * 100)) : 0;
      downloadBlob(blob, `${safeName(activeSource.fileName)}-compact.pdf`);
      setMessage(`已重建交叉引用并移除增量历史，输出 ${formatBytes(blob.size)}，节省 ${saved}%。`);
    } catch (compactError) {
      setError(compactError instanceof Error ? compactError.message : "PDF 整理压缩失败");
    } finally {
      setBusy(false);
    }
  }

  // --- Tab 2: PDF Metadata States ---
  const [report, setReport] = useState<PdfReport | null>(null);
  const [error, setError] = useState("");

  async function loadMetadataFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

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
          <p className="eyebrow">文档与安全</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #eee", gap: "24px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("editor")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "editor" ? "bold" : "normal",
            color: activeTab === "editor" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "editor" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          📄 PDF 拆分/合并/压缩
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("metadata")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "metadata" ? "bold" : "normal",
            color: activeTab === "metadata" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "metadata" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          🔍 PDF 元数据查看与清理
        </button>
      </div>

      {activeTab === "editor" ? (
        <>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>PDF 文件</span>
              <input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => void loadFiles(event)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>拆分 / 压缩目标</span>
              <select value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))} disabled={sources.length === 0}>
                {sources.map((source, index) => (
                  <option key={source.fileName} value={index}>{source.fileName}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void mergeFiles()} disabled={busy || sources.length === 0}>合并 PDF</button>
            <button type="button" onClick={() => void splitActiveFile()} disabled={busy || !activeSource}>拆分为 ZIP</button>
            <button type="button" onClick={() => void compactActiveFile()} disabled={busy || !activeSource}>整理压缩</button>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>文件</h3>
              <p>{sources.length}</p>
            </article>
            <article className="detail-card">
              <h3>页数</h3>
              <p>{totals.pages}</p>
            </article>
            <article className="detail-card">
              <h3>对象</h3>
              <p>{totals.objects}</p>
            </article>
            <article className="detail-card">
              <h3>原始大小</h3>
              <p>{formatBytes(totals.bytes)}</p>
            </article>
          </div>

          {sources.length > 0 ? (
            <div className="tool-table" style={{ marginTop: "16px" }}>
              <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "minmax(12rem, 1fr) 5rem 6rem 7rem 1fr" }}>
                <span>文件</span>
                <span>版本</span>
                <span>页数</span>
                <span>大小</span>
                <span>提示</span>
              </div>
              {sources.map((source) => (
                <div key={source.fileName} className="tool-table__row" style={{ gridTemplateColumns: "minmax(12rem, 1fr) 5rem 6rem 7rem 1fr" }}>
                  <span className="mono-output">{source.fileName}</span>
                  <span>{source.version}</span>
                  <span>{source.pageIds.length}</span>
                  <span>{formatBytes(source.size)}</span>
                  <span>{source.warnings.length > 0 ? source.warnings.join(" / ") : "可处理"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: "16px" }}>
              <strong>等待 PDF</strong>
              <p>选择一个或多个 PDF 后，可以按顺序合并，或对单个文件拆分与整理压缩。</p>
            </div>
          )}

          <p className="tool-note" style={{ marginTop: "16px" }}>
            压缩为无损结构整理：重写对象编号、交叉引用和页面树，通常可移除增量保存历史；不会重新采样图片或解密受保护文件。
          </p>
          {message ? <p className="tool-note" style={{ color: "#4f46e5", fontWeight: "600" }}>{message}</p> : null}
        </>
      ) : (
        <>
          {/* Metadata view */}
          <div className="tool-toolbar">
            <label className="tool-field tool-field--compact">
              <span>选择 PDF 文件</span>
              <input type="file" accept="application/pdf,.pdf" onChange={(event) => void loadMetadataFile(event)} />
            </label>
            <button
              type="button"
              disabled={!report}
              onClick={() => report ? downloadBlob(report.cleaned, `clean-${report.name}`) : undefined}
              style={{ background: "#4f46e5", color: "#fff", fontWeight: "600" }}
            >
              📥 下载清理后的 PDF (移除所有敏感元数据)
            </button>
          </div>

          {report ? (
            <>
              <div className="detail-grid" style={{ marginTop: "16px" }}>
                <article className="detail-card">
                  <h3>PDF 版本</h3>
                  <p>{report.version}</p>
                </article>
                <article className="detail-card">
                  <h3>大小</h3>
                  <p>{formatBytes(report.size)}</p>
                </article>
                <article className="detail-card">
                  <h3>Info 元数据字段</h3>
                  <p>{report.fields.length}</p>
                </article>
                <article className="detail-card">
                  <h3>XMP 信息包</h3>
                  <p>{report.xmpPackets}</p>
                </article>
              </div>

              <div className="tool-table" style={{ marginTop: "16px" }}>
                <div className="tool-table__row tool-table__row--head">
                  <span>元数据属性 (Key)</span>
                  <span>属性值 (Value)</span>
                </div>
                {report.fields.length > 0 ? report.fields.map((field) => (
                  <div key={field.key} className="tool-table__row">
                    <span style={{ fontWeight: 600 }}>{field.key}</span>
                    <span>{field.value || "空 / 未设置"}</span>
                  </div>
                )) : (
                  <div className="tool-table__row" style={{ gridTemplateColumns: "1fr" }}>
                    <span>未发现常见 Info 元数据字段</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ marginTop: "16px" }}>
              <strong>等待选择 PDF 文件</strong>
              <p>选择 PDF 后将显示其元数据字段（如作者、创建工具、修改日期等）并提供一键脱敏清理下载。</p>
            </div>
          )}
        </>
      )}

      {error ? <p className="tool-error" style={{ marginTop: "12px" }}>{error}</p> : null}
    </section>
  );
}
