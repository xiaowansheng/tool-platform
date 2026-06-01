"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

interface HashRow {
  name: string;
  size: number;
  type: string;
  hash: string;
}

const algorithms: HashAlgorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function rowsToCsv(rows: HashRow[], algorithm: HashAlgorithm) {
  const headers = ["name", "size", "type", algorithm.toLowerCase()];
  const body = rows.map((row) => [row.name, row.size, row.type, row.hash].map(escapeCsvCell).join(","));
  return [headers.join(","), ...body].join("\n");
}

export default function BatchFileHashCalculatorTool({ manifest }: ToolClientProps) {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [rows, setRows] = useState<HashRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const csv = useMemo(() => rowsToCsv(rows, algorithm), [algorithm, rows]);
  const totalBytes = rows.reduce((sum, row) => sum + row.size, 0);

  async function hashFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length === 0) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const nextRows: HashRow[] = [];

      for (const file of files) {
        const digest = await crypto.subtle.digest(algorithm, await file.arrayBuffer());
        nextRows.push({
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          hash: toHex(digest)
        });
      }

      setRows(nextRows);
    } catch (hashError) {
      setError(hashError instanceof Error ? hashError.message : "文件 Hash 计算失败");
    } finally {
      setBusy(false);
    }
  }

  async function copyCsv() {
    await navigator.clipboard.writeText(csv);
  }

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `file-hashes-${algorithm.toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">校验和</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>算法</span>
          <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}>
            {algorithms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>文件</span>
          <input type="file" multiple onChange={(event) => void hashFiles(event)} />
        </label>
        <button type="button" disabled={rows.length === 0} onClick={() => void copyCsv()}>
          复制 CSV
        </button>
        <button type="button" disabled={rows.length === 0} onClick={downloadCsv}>
          下载 CSV
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>文件数</h3>
          <p>{rows.length}</p>
        </article>
        <article className="detail-card">
          <h3>总大小</h3>
          <p>{formatBytes(totalBytes)}</p>
        </article>
        <article className="detail-card">
          <h3>状态</h3>
          <p>{busy ? "计算中" : "就绪"}</p>
        </article>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "minmax(12rem, 1fr) 7rem 9rem minmax(18rem, 1.4fr)" }}>
          <span>文件名</span>
          <span>大小</span>
          <span>类型</span>
          <span>{algorithm}</span>
        </div>
        {rows.map((row) => (
          <div key={`${row.name}-${row.hash}`} className="tool-table__row" style={{ gridTemplateColumns: "minmax(12rem, 1fr) 7rem 9rem minmax(18rem, 1.4fr)" }}>
            <span>{row.name}</span>
            <span>{formatBytes(row.size)}</span>
            <span>{row.type}</span>
            <span className="mono-output">{row.hash}</span>
          </div>
        ))}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
