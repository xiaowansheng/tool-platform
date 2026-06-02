"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface BinaryReport {
  name: string;
  size: number;
  format: string;
  details: Array<{ key: string; value: string }>;
  hexRows: Array<{ offset: string; hex: string; ascii: string }>;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return Array.from(bytes.slice(start, start + length), (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
}

function hex(byte: number) {
  return byte.toString(16).padStart(2, "0");
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function buildHexRows(bytes: Uint8Array) {
  const rows = [];
  const limit = Math.min(bytes.length, 256);

  for (let offset = 0; offset < limit; offset += 16) {
    const slice = bytes.slice(offset, offset + 16);
    rows.push({
      offset: `0x${offset.toString(16).padStart(6, "0")}`,
      hex: Array.from(slice, hex).join(" "),
      ascii: ascii(slice, 0, slice.length)
    });
  }

  return rows;
}

function inspectBinaryFile(file: File, buffer: ArrayBuffer): BinaryReport {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const details: Array<{ key: string; value: string }> = [
    { key: "文件名", value: file.name },
    { key: "大小", value: formatBytes(file.size) }
  ];
  let format = "Unknown binary";

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "PAR1" && ascii(bytes, bytes.length - 4, 4) === "PAR1") {
    const footerLength = view.getUint32(bytes.length - 8, true);
    const footerStart = bytes.length - 8 - footerLength;

    format = "Parquet";
    details.push(
      { key: "Magic", value: "PAR1" },
      { key: "Footer length", value: formatBytes(footerLength) },
      { key: "Footer offset", value: footerStart >= 0 ? `0x${footerStart.toString(16)}` : "无效" },
      { key: "Data region", value: footerStart >= 4 ? formatBytes(footerStart - 4) : "无效" }
    );
  } else if (bytes.length >= 14 && ascii(bytes, 0, 6) === "ARROW1" && ascii(bytes, bytes.length - 6, 6) === "ARROW1") {
    const footerLength = view.getInt32(bytes.length - 10, true);
    const footerStart = bytes.length - 10 - footerLength;

    format = "Arrow IPC / Feather V2";
    details.push(
      { key: "Magic", value: "ARROW1" },
      { key: "Footer length", value: formatBytes(Math.max(0, footerLength)) },
      { key: "Footer offset", value: footerStart >= 0 ? `0x${footerStart.toString(16)}` : "无效" }
    );
  } else if (bytes.length >= 4 && ascii(bytes, 0, 4) === "FEA1") {
    format = "Feather V1";
    details.push({ key: "Magic", value: "FEA1" });
  } else {
    details.push(
      { key: "Head magic", value: ascii(bytes, 0, Math.min(8, bytes.length)) },
      { key: "Tail magic", value: ascii(bytes, Math.max(0, bytes.length - 8), Math.min(8, bytes.length)) }
    );
  }

  return {
    name: file.name,
    size: file.size,
    format,
    details,
    hexRows: buildHexRows(bytes)
  };
}

export default function ParquetArrowPreviewTool({ manifest }: ToolAppProps) {
  const [report, setReport] = useState<BinaryReport | null>(null);
  const [error, setError] = useState("");

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      setReport(inspectBinaryFile(file, await file.arrayBuffer()));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "文件读取失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">列式文件</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>Parquet / Arrow 文件</span>
          <input type="file" accept=".parquet,.arrow,.feather,application/octet-stream" onChange={(event) => void loadFile(event)} />
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
              <p>{report.name}</p>
            </article>
            <article className="detail-card">
              <h3>大小</h3>
              <p>{formatBytes(report.size)}</p>
            </article>
          </div>
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>字段</span>
              <span>值</span>
            </div>
            {report.details.map((item) => (
              <div key={item.key} className="tool-table__row">
                <span>{item.key}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "7rem minmax(18rem, 1fr) minmax(8rem, 0.7fr)" }}>
              <span>偏移</span>
              <span>十六进制</span>
              <span>ASCII</span>
            </div>
            {report.hexRows.map((row) => (
              <div key={row.offset} className="tool-table__row" style={{ gridTemplateColumns: "7rem minmax(18rem, 1fr) minmax(8rem, 0.7fr)" }}>
                <span>{row.offset}</span>
                <span className="mono-output">{row.hex}</span>
                <span className="mono-output">{row.ascii}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <strong>等待文件</strong>
          <p>选择文件后显示格式摘要和前 256 字节预览。</p>
        </div>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
