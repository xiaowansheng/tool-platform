"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function splitValues(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSegment(value: string, uppercase: boolean) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 12);

  return uppercase ? normalized.toUpperCase() : normalized.toLowerCase();
}

function buildSkuRows(brand: string, category: string, colors: string[], sizes: string[], start: number, delimiter: string, uppercase: boolean) {
  const rows: Array<{ sku: string; color: string; size: string }> = [];

  for (const color of colors) {
    for (const size of sizes) {
      const sequence = String(start + rows.length).padStart(4, "0");
      const sku = [brand, category, color, size, sequence]
        .map((part) => normalizeSegment(part, uppercase))
        .filter(Boolean)
        .join(delimiter);

      rows.push({ sku, color, size });
    }
  }

  return rows.slice(0, 250);
}

export default function SkuGeneratorTool({ manifest }: ToolAppProps) {
  const [brand, setBrand] = useState("acme");
  const [category, setCategory] = useState("tee");
  const [colors, setColors] = useState("black, white, green");
  const [sizes, setSizes] = useState("S, M, L, XL");
  const [start, setStart] = useState(1);
  const [delimiter, setDelimiter] = useState("-");
  const [uppercase, setUppercase] = useState(true);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const rows = useMemo(() => buildSkuRows(brand, category, splitValues(colors), splitValues(sizes), start, delimiter, uppercase), [brand, category, colors, delimiter, sizes, start, uppercase]);
  const plain = rows.map((row) => row.sku).join("\n");
  const csv = ["sku,brand,category,color,size", ...rows.map((row) => [row.sku, brand, category, row.color, row.size].map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(","))].join("\n");

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
          <p className="eyebrow">商品目录</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>品牌</span><input value={brand} onChange={(event) => setBrand(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>品类</span><input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>起始序号</span><input type="number" min="0" value={start} onChange={(event) => setStart(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>分隔符</span><input value={delimiter} maxLength={3} onChange={(event) => setDelimiter(event.target.value)} /></label>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => setUppercase((value) => !value)}>{uppercase ? "大写 SKU" : "小写 SKU"}</button>
        <button type="button" onClick={() => void copy("sku", plain)}>{copied === "sku" ? "已复制" : "复制 SKU"}</button>
        <button type="button" onClick={() => void copy("csv", csv)}>{copied === "csv" ? "已复制" : "复制 CSV"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>变体数</h3><p>{rows.length}</p></article>
        <article className="detail-card"><h3>颜色数</h3><p>{splitValues(colors).length}</p></article>
        <article className="detail-card"><h3>尺码数</h3><p>{splitValues(sizes).length}</p></article>
        <article className="detail-card"><h3>示例</h3><p>{rows[0]?.sku ?? "-"}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>颜色，逗号或换行分隔</span><textarea value={colors} onChange={(event) => setColors(event.target.value)} /></label>
          <label className="tool-field"><span>尺码，逗号或换行分隔</span><textarea value={sizes} onChange={(event) => setSizes(event.target.value)} /></label>
        </div>
        <label className="tool-field">
          <span>SKU 输出</span>
          <textarea value={plain} readOnly spellCheck={false} />
        </label>
      </div>

      {rows.length >= 250 ? <p className="tool-error">预览限制为 250 个 SKU，请拆分批次生成。</p> : null}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">SKU 生成只做格式规范化；正式入库前仍应检查平台唯一性和已有库存编码。</p>
    </section>
  );
}
