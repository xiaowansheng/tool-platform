"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface NormalizedEmail {
  original: string;
  normalized: string;
  valid: boolean;
}

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

function normalizeEmail(email: string): NormalizedEmail {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { original: email, normalized: trimmed, valid: false };
  }

  const [localPart, domain] = trimmed.split("@") as [string, string];

  // Gmail-specific rules
  if (GMAIL_DOMAINS.has(domain)) {
    // Remove dots from local part (Gmail ignores them)
    let normalizedLocal = localPart.replace(/\./g, "");
    // Remove everything after + (Gmail treats it as alias)
    const plusIndex = normalizedLocal.indexOf("+");
    if (plusIndex !== -1) {
      normalizedLocal = normalizedLocal.slice(0, plusIndex);
    }
    return {
      original: email,
      normalized: `${normalizedLocal}@gmail.com`,
      valid: true
    };
  }

  // Outlook/Hotmail: case-insensitive, supports + aliases
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") {
    let normalizedLocal = localPart;
    const plusIndex = normalizedLocal.indexOf("+");
    if (plusIndex !== -1) {
      normalizedLocal = normalizedLocal.slice(0, plusIndex);
    }
    return { original: email, normalized: `${normalizedLocal}@${domain}`, valid: true };
  }

  // Default: just lowercase
  return { original: email, normalized: trimmed, valid: true };
}

export default function EmailNormalizerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(
    "John.Doe+newsletter@Gmail.com\njane.doe@OUTLOOK.COM\nuser+test@Gmail.com\nuser@gmail.com\ninvalid-email"
  );
  const [results, setResults] = useState<NormalizedEmail[]>([]);
  const [copied, setCopied] = useState(false);

  function handleNormalize() {
    const lines = input.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const normalized = lines.map(normalizeEmail);
    setResults(normalized);
    setCopied(false);
  }

  function handleDeduplicate() {
    const lines = input.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const normalized = lines.map(normalizeEmail);
    const seen = new Set<string>();
    const unique: NormalizedEmail[] = [];
    for (const item of normalized) {
      if (item.valid && !seen.has(item.normalized)) {
        seen.add(item.normalized);
        unique.push(item);
      } else if (!item.valid) {
        unique.push(item);
      }
    }
    setResults(unique);
    setCopied(false);
  }

  async function handleCopy() {
    const validEmails = results.filter((r) => r.valid).map((r) => r.normalized).join("\n");
    await navigator.clipboard.writeText(validEmails);
    setCopied(true);
  }

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;
  const uniqueCount = new Set(results.filter((r) => r.valid).map((r) => r.normalized)).size;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据清洗</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <label className="tool-field">
        <span>输入邮箱地址（每行一个，或用逗号/分号分隔）</span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          rows={6}
        />
      </label>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={handleNormalize}>
          标准化
        </button>
        <button type="button" onClick={handleDeduplicate}>
          标准化 + 去重
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={results.length === 0}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      {results.length > 0 ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>总数</h3>
              <p>{results.length}</p>
            </article>
            <article className="detail-card">
              <h3>有效</h3>
              <p>{validCount}</p>
            </article>
            <article className="detail-card">
              <h3>无效</h3>
              <p>{invalidCount}</p>
            </article>
            <article className="detail-card">
              <h3>去重后</h3>
              <p>{uniqueCount}</p>
            </article>
          </div>

          <label className="tool-field">
            <span>处理结果</span>
            <div style={{ maxHeight: "300px", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border, #333)" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px" }}>原始</th>
                    <th style={{ textAlign: "left", padding: "4px 8px" }}>标准化</th>
                    <th style={{ textAlign: "center", padding: "4px 8px" }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border, #222)" }}>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", fontSize: "0.9em", opacity: 0.7 }}>{r.original}</td>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", fontSize: "0.9em" }}>{r.normalized}</td>
                      <td style={{ padding: "4px 8px", textAlign: "center" }}>{r.valid ? "✓" : "✗"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </label>
        </>
      ) : null}

      <p className="tool-note">
        Gmail 规则：忽略用户名中的点号，忽略 + 后面的别名部分。Outlook/Hotmail 支持 + 别名。其他域名仅做小写标准化。
      </p>
    </section>
  );
}
