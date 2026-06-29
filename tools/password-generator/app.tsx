"use client";

import { useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const characterSets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?"
};

type CharacterSetKey = keyof typeof characterSets;

const optionLabels: Record<CharacterSetKey, string> = {
  uppercase: "大写字母 (A-Z)",
  lowercase: "小写字母 (a-z)",
  numbers: "数字 (0-9)",
  symbols: "特殊符号 (!@#...)"
};

const confusableChars = new Set(["0", "O", "o", "1", "l", "I", "|", "2", "Z", "z"]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function secureIndex(max: number) {
  const random = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;

  do {
    crypto.getRandomValues(random);
  } while (random[0] >= limit);

  return random[0] % max;
}

// Generate single password
function generatePassword(length: number, enabledSets: CharacterSetKey[], excludeConfusables: boolean) {
  if (enabledSets.length === 0) {
    throw new Error("至少选择一种字符类型");
  }

  // Build character pools, filtering out confusables if enabled
  const getPool = (key: CharacterSetKey) => {
    const original = characterSets[key];
    if (!excludeConfusables) return original;
    return original.split("").filter(char => !confusableChars.has(char)).join("");
  };

  const pool = enabledSets.map((key) => getPool(key)).join("");
  if (pool.length === 0) {
    throw new Error("排除易混淆字符后，字符池为空，请增加字符集种类");
  }

  const required = enabledSets.map((key) => {
    const set = getPool(key);
    if (set.length === 0) return "";
    return set[secureIndex(set.length)];
  }).filter(Boolean);

  const remaining = Array.from(
    { length: Math.max(0, length - required.length) }, 
    () => pool[secureIndex(pool.length)]
  );

  const combined = [...required, ...remaining];

  // Shuffle characters securely
  for (let index = combined.length - 1; index > 0; index -= 1) {
    const swapIndex = secureIndex(index + 1);
    [combined[index], combined[swapIndex]] = [combined[swapIndex] ?? "", combined[index] ?? ""];
  }

  return combined.join("");
}

function estimateStrength(length: number, enabledSets: CharacterSetKey[], excludeConfusables: boolean) {
  const getPoolSize = (key: CharacterSetKey) => {
    const original = characterSets[key].length;
    if (!excludeConfusables) return original;
    return characterSets[key].split("").filter(char => !confusableChars.has(char)).length;
  };

  const poolSize = enabledSets.reduce((total, key) => total + getPoolSize(key), 0);
  const entropy = poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

  if (entropy >= 80) {
    return { label: "非常强 (High Security)", color: "#22c55e", entropy };
  }
  if (entropy >= 60) {
    return { label: "中等强度 (Medium)", color: "#eab308", entropy };
  }
  return { label: "强度弱 (Low Security)", color: "#ef4444", entropy };
}

export default function PasswordGeneratorTool({ manifest }: ToolAppProps) {
  const [length, setLength] = useState(20);
  const [batchCount, setBatchCount] = useState(1);
  const [excludeConfusables, setExcludeConfusables] = useState(true);
  const [enabled, setEnabled] = useState<Record<CharacterSetKey, boolean>>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  
  // List of generated passwords
  const [passwords, setPasswords] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [error, setError] = useState("");

  const enabledSets = (Object.keys(enabled) as CharacterSetKey[]).filter((key) => enabled[key]);
  const normalizedLength = clamp(length, 8, 128);
  
  const strength = estimateStrength(normalizedLength, enabledSets, excludeConfusables);
  const characterPoolSize = enabledSets.reduce((total, key) => {
    const original = characterSets[key];
    if (!excludeConfusables) return total + original.length;
    return total + original.split("").filter(char => !confusableChars.has(char)).length;
  }, 0);

  // Auto generate on mount
  useEffect(() => {
    handleGenerate(1); // Default single on load
  }, []);

  function handleGenerate(countOverride?: number) {
    const count = countOverride !== undefined ? countOverride : batchCount;
    try {
      const list: string[] = [];
      for (let i = 0; i < count; i++) {
        list.push(generatePassword(normalizedLength, enabledSets, excludeConfusables));
      }
      setPasswords(list);
      setCopiedIndex(null);
      setCopiedAll(false);
      setError("");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "密码生成失败");
    }
  }

  async function copyPassword(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  async function copyAllPasswords() {
    if (passwords.length === 0) return;
    await navigator.clipboard.writeText(passwords.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  return (
    <section className="tool-panel">
      {/* Visual styles injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .pwd-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }
        .pwd-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .pwd-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          margin-bottom: 0.5rem;
        }
        .pwd-row span.mono {
          font-family: var(--font-mono), monospace;
          font-size: 0.95rem;
          letter-spacing: 0.5px;
          word-break: break-all;
          user-select: all;
        }
        .pwd-row button {
          font-size: 0.75rem;
          padding: 2px 8px;
          height: 24px;
          flex-shrink: 0;
          margin-left: 0.75rem;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">安全性保障</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "生成符合高强度密码学随机的随机密码，支持批量生成机制以及剔除易混淆的人眼识别敏感字符。"}</p>
      </div>

      <div className="pwd-container">
        {/* Configurations Card */}
        <div className="pwd-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", margin: 0 }}>
            <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
              <span>密码长度 (8-128)</span>
              <input
                type="number"
                min={8}
                max={128}
                value={length}
                onChange={(event) => setLength(Number(event.target.value))}
                style={{ height: "36px" }}
              />
            </label>
            <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
              <span>批量生成数量 (1-50)</span>
              <select 
                value={batchCount} 
                onChange={(e) => setBatchCount(Number(e.target.value))} 
                style={{ height: "36px" }}
              >
                <option value="1">单个密码 (1)</option>
                <option value="5">批量 5 个</option>
                <option value="10">批量 10 个</option>
                <option value="20">批量 20 个</option>
                <option value="50">批量 50 个</option>
              </select>
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignSelf: "end" }}>
              <button type="button" className="button--primary" onClick={() => handleGenerate()} style={{ height: "36px", padding: "0 1.5rem" }}>
                重新生成
              </button>
              {passwords.length > 1 && (
                <button type="button" onClick={copyAllPasswords} style={{ height: "36px", padding: "0 1.25rem" }}>
                  {copiedAll ? "全部复制成功" : "复制全部"}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", borderTop: "1px solid var(--border-default)", paddingTop: "0.75rem" }}>
            {/* Checkboxes */}
            {(Object.keys(optionLabels) as CharacterSetKey[]).map((key) => (
              <label key={key} className="tool-check" style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={enabled[key]}
                  onChange={(event) => setEnabled((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <span style={{ marginLeft: "0.25rem" }}>{optionLabels[key]}</span>
              </label>
            ))}
            
            <label className="tool-check" style={{ cursor: "pointer", fontSize: "0.85rem", borderLeft: "1px solid var(--border-default)", paddingLeft: "1.25rem" }}>
              <input
                type="checkbox"
                checked={excludeConfusables}
                onChange={(e) => setExcludeConfusables(e.target.checked)}
              />
              <span style={{ marginLeft: "0.25rem", color: "var(--accent-primary)", fontWeight: "600" }}>
                避开易混淆字符 (如 1, l, I, 0, O, o 等)
              </span>
            </label>
          </div>
        </div>

        {/* Results layout */}
        <div className="pwd-card">
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem" }}>生成的安全随机字串</h3>
          
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {passwords.map((pwd, idx) => (
              <div key={idx} className="pwd-row">
                <span className="mono">{pwd}</span>
                <button type="button" onClick={() => copyPassword(pwd, idx)}>
                  {copiedIndex === idx ? "已复制" : "复制"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Strength statistics */}
        <div className="detail-grid">
          <article className="detail-card">
            <h3>熵安全性评估</h3>
            <p style={{ fontWeight: "700", color: strength.color }}>{strength.label}</p>
          </article>
          <article className="detail-card">
            <h3>熵值 (Entropy)</h3>
            <p>{strength.entropy} 位 (bits)</p>
          </article>
          <article className="detail-card">
            <h3>可用字符池体积</h3>
            <p>{characterPoolSize} 个字符</p>
          </article>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "1.25rem" }}>
        安全性背书：随机密码完全通过浏览器底层的密码学安全伪随机数生成器（`crypto.getRandomValues`）本地生成，不依赖任何第三方网络接口或外部算法，保障绝对私密性。
      </p>
    </section>
  );
}
