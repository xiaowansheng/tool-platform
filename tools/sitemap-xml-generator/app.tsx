"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

const defaultEntries: SitemapEntry[] = [
  { url: "https://example.com/", lastmod: new Date().toISOString().slice(0, 10), changefreq: "daily", priority: "1.0" },
  { url: "https://example.com/about", lastmod: new Date().toISOString().slice(0, 10), changefreq: "monthly", priority: "0.8" },
  { url: "https://example.com/blog", lastmod: new Date().toISOString().slice(0, 10), changefreq: "weekly", priority: "0.9" },
  { url: "https://example.com/contact", lastmod: "", changefreq: "yearly", priority: "0.5" }
];

const freqOptions = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

function generateSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .filter((e) => e.url.trim())
    .map((entry) => {
      let urlBlock = `  <url>\n    <loc>${escapeXml(entry.url)}</loc>`;
      if (entry.lastmod) urlBlock += `\n    <lastmod>${entry.lastmod}</lastmod>`;
      if (entry.changefreq) urlBlock += `\n    <changefreq>${entry.changefreq}</changefreq>`;
      if (entry.priority) urlBlock += `\n    <priority>${entry.priority}</priority>`;
      urlBlock += "\n  </url>";
      return urlBlock;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseUrls(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter((l) => l && (l.startsWith("http://") || l.startsWith("https://")));
}

export default function SitemapXmlGeneratorTool({ manifest }: ToolAppProps) {
  const [entries, setEntries] = useState<SitemapEntry[]>(defaultEntries);
  const [bulkInput, setBulkInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [defaultFreq, setDefaultFreq] = useState("weekly");
  const [defaultPriority, setDefaultPriority] = useState("0.8");

  const xml = useMemo(() => generateSitemapXml(entries), [entries]);

  function addBulkUrls() {
    const urls = parseUrls(bulkInput);
    if (urls.length === 0) return;
    const newEntries = urls.map((url) => ({
      url,
      lastmod: new Date().toISOString().slice(0, 10),
      changefreq: defaultFreq,
      priority: defaultPriority
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    setBulkInput("");
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: keyof SitemapEntry, value: string) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
  }

  function handleDownload() {
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">SEO 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>默认更新频率</span>
          <select value={defaultFreq} onChange={(e) => setDefaultFreq(e.target.value)}>
            {freqOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>默认优先级</span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={defaultPriority}
            onChange={(e) => setDefaultPriority(e.target.value)}
          />
        </label>
        <button type="button" onClick={() => void handleCopy()} disabled={!xml}>
          {copied ? "已复制" : "复制 XML"}
        </button>
        <button type="button" onClick={handleDownload}>下载 sitemap.xml</button>
      </div>

      <label className="tool-field">
        <span>批量添加 URL（每行一个）</span>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={3}
            placeholder="https://example.com/page1&#10;https://example.com/page2"
            style={{ flex: 1 }}
          />
          <button type="button" onClick={addBulkUrls}>添加</button>
        </div>
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>URL 数量</h3>
          <p>{entries.filter((e) => e.url.trim()).length}</p>
        </article>
        <article className="detail-card">
          <h3>XML 大小</h3>
          <p>{new Blob([xml]).size} B</p>
        </article>
      </div>

      {entries.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--border, #ddd)" }}>URL</th>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--border, #ddd)", width: 120 }}>最后修改</th>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--border, #ddd)", width: 100 }}>频率</th>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--border, #ddd)", width: 70 }}>优先级</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={i}>
                  <td style={{ padding: "4px 8px" }}>
                    <input
                      value={entry.url}
                      onChange={(e) => updateEntry(i, "url", e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </td>
                  <td style={{ padding: "4px 8px" }}>
                    <input
                      type="date"
                      value={entry.lastmod}
                      onChange={(e) => updateEntry(i, "lastmod", e.target.value)}
                    />
                  </td>
                  <td style={{ padding: "4px 8px" }}>
                    <select value={entry.changefreq} onChange={(e) => updateEntry(i, "changefreq", e.target.value)}>
                      {freqOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "4px 8px" }}>
                    <input
                      value={entry.priority}
                      onChange={(e) => updateEntry(i, "priority", e.target.value)}
                      style={{ width: 50 }}
                    />
                  </td>
                  <td style={{ padding: "4px 8px" }}>
                    <button type="button" onClick={() => removeEntry(i)} title="移除">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="tool-field">
        <span>XML 预览</span>
        <textarea value={xml} readOnly spellCheck={false} rows={12} className="mono-output" />
      </label>

      <p className="tool-note">
        生成的 XML 遵循 sitemaps.org 标准协议。每个 URL 可单独设置更新频率和优先级。
        支持批量添加和下载文件。
      </p>
    </section>
  );
}
