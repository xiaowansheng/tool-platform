"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ScannerResult {
  ruleName: string;
  line: number;
  matchText: string;
  maskedText: string;
  entropy: number;
  severity: "high" | "medium";
}

const sampleCode = `# 示例配置文件 (包含硬编码的测试密钥)
app_port = 8080
db_host = "localhost"

# AWS 凭证 (测试用例)
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# GitHub Token
GITHUB_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
FINE_GRAINED_TOKEN = "github_pat_11A2B3C4D0abcdefghijkl_1234567890abcdefghijklmnopqrstuvwxyz12345"

# Google Cloud API Key
GOOGLE_API_KEY = "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q"

# 私钥
SSH_KEY = """
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtcn
NhAAAAAwEAAQAAAYEA0R2F25...
-----END OPENSSH PRIVATE KEY-----
"""

# 高熵随机字符串
ADMIN_SECRET = "x9f2LpQ8sW3vB1mK4zT7hD5eG6cR0yY1"
`;

// Calculate Shannon Entropy
function getShannonEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return parseFloat(entropy.toFixed(2));
}

// Mask secret for secure display: e.g. "AKIAIOSFODNN7EXAMPLE" -> "AKIAIO************MPLE"
function maskSecret(str: string): string {
  if (str.length <= 8) return "*".repeat(str.length);
  const prefix = str.substring(0, 6);
  const suffix = str.substring(str.length - 4);
  return `${prefix}${"*".repeat(Math.max(4, str.length - 10))}${suffix}`;
}

export default function SecretsScanner({ manifest }: ToolAppProps) {
  const [inputText, setInputText] = useState(sampleCode);
  const [results, setResults] = useState<ScannerResult[] | null>(null);
  const [redactedText, setRedactedText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const scanRules = useMemo(() => {
    return [
      {
        name: "AWS Access Key",
        regex: /\b(AKIA[0-9A-Z]{16})\b/g,
        severity: "high" as const
      },
      {
        name: "GitHub Classic Token",
        regex: /\b(ghp_[a-zA-Z0-9]{36})\b/g,
        severity: "high" as const
      },
      {
        name: "GitHub Fine-Grained Token",
        regex: /\b(github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
        severity: "high" as const
      },
      {
        name: "Google Cloud API Key",
        regex: /\b(AIzaSy[0-9A-Za-z\-_]{35})\b/g,
        severity: "high" as const
      },
      {
        name: "SSH Private Key Block",
        regex: /(-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----)/g,
        severity: "high" as const
      },
      {
        name: "Slack Webhook URL",
        regex: /(https:\/\/hooks\.slack\.com\/services\/[T][A-Z0-9]{8}\/[B][A-Z0-9]{8}\/[a-zA-Z0-9]{24})/g,
        severity: "high" as const
      },
      {
        name: "Stripe API Key",
        regex: /\b(sk_live_[0-9a-zA-Z]{24})\b/g,
        severity: "high" as const
      }
    ];
  }, []);

  const handleScan = () => {
    const lines = inputText.split("\n");
    const foundSecrets: ScannerResult[] = [];

    // 1. Scan defined regex signatures
    lines.forEach((lineText, lineIdx) => {
      const lineNum = lineIdx + 1;

      scanRules.forEach((rule) => {
        // Reset regex lastIndex
        rule.regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = rule.regex.exec(lineText)) !== null) {
          const secret = match[1];
          foundSecrets.push({
            ruleName: rule.name,
            line: lineNum,
            matchText: secret,
            maskedText: maskSecret(secret),
            entropy: getShannonEntropy(secret),
            severity: rule.severity
          });
        }
      });

      // 2. Entropy scanning for raw strings (e.g. api keys or high entropy tokens)
      // Look for long, unspaced alphanumerics inside quotes/braces or after equals sign
      const candidateMatches = lineText.match(/(?:["'=:\s])([a-zA-Z0-9_\-\/]{20,80})(?:["'\s]|$)/g);
      if (candidateMatches) {
        candidateMatches.forEach((rawCandidate) => {
          const cleaned = rawCandidate.replace(/["'=:\s]/g, "").trim();
          
          // Exclude known matches already captured to avoid duplication
          if (foundSecrets.some((s) => s.matchText.includes(cleaned) || cleaned.includes(s.matchText))) {
            return;
          }

          // Filter out standard common paths, dates or easy word sequences
          if (/^\d+$/.test(cleaned)) return;
          if (cleaned.startsWith("/") || cleaned.startsWith("http")) return;

          const entropy = getShannonEntropy(cleaned);
          // Flag strings with high entropy (randomness) - typical threshold is > 4.5
          if (entropy > 4.4) {
            foundSecrets.push({
              ruleName: "High Entropy Token / API Key (高熵密钥)",
              line: lineNum,
              matchText: cleaned,
              maskedText: maskSecret(cleaned),
              entropy,
              severity: "medium"
            });
          }
        });
      }
    });

    setResults(foundSecrets);
    setRedactedText("");
  };

  const handleRedact = () => {
    if (!results || results.length === 0) {
      setRedactedText(inputText);
      return;
    }

    let cleaned = inputText;
    // Replace each match text with redacted label
    // Sort from longest to shortest match to prevent substring replacements breaking larger tokens
    const sortedMatches = [...results].sort((a, b) => b.matchText.length - a.matchText.length);

    sortedMatches.forEach((item) => {
      // Escape special characters for safe regex replacement
      const escaped = item.matchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const replacer = new RegExp(escaped, "g");
      cleaned = cleaned.replace(replacer, `[REDACTED_${item.ruleName.toUpperCase().replace(/\s+/g, "_")}]`);
    });

    setRedactedText(cleaned);
  };

  const copyRedacted = async () => {
    if (!redactedText) return;
    try {
      await navigator.clipboard.writeText(redactedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络安全</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column" style={{ gap: "24px" }}>
        {/* Left Column: Input Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label className="tool-field" style={{ flex: 1 }}>
            <span>配置文件 / 代码 / 环境变量</span>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ minHeight: "350px", fontFamily: "monospace", fontSize: "13px" }}
              placeholder="请在这里粘贴包含密钥的代码或环境变量文本..."
            />
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              className="button--primary"
              onClick={handleScan}
              style={{ flex: 1, padding: "10px" }}
            >
              🛡️ 扫描硬编码密钥
            </button>
            <button
              type="button"
              onClick={() => {
                setInputText(sampleCode);
                setResults(null);
                setRedactedText("");
              }}
              style={{ padding: "10px" }}
            >
              载入测试示例
            </button>
          </div>
        </div>

        {/* Right Column: Scan results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600 }}>扫描报告</h3>

          {results !== null ? (
            results.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ color: "#ef4444", fontWeight: 600, fontSize: "14px" }}>
                  ⚠️ 检测到 {results.length} 个潜在的敏感凭证/硬编码密钥！
                </p>

                <div style={{ maxHeight: "280px", overflowY: "auto", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
                        <th style={{ padding: "8px", textAlign: "left" }}>行号</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>类型</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>匹配项预览</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>香农熵</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                          <td style={{ padding: "8px", color: "#6b7280" }}>L{item.line}</td>
                          <td style={{ padding: "8px", fontWeight: 600, color: item.severity === "high" ? "#ef4444" : "#f59e0b" }}>
                            {item.ruleName}
                          </td>
                          <td style={{ padding: "8px", fontFamily: "monospace" }}>{item.maskedText}</td>
                          <td style={{ padding: "8px", opacity: 0.8 }}>{item.entropy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleRedact}
                  style={{ backgroundColor: "#3b82f6", color: "#fff", border: 0, padding: "10px", borderRadius: "4px", fontWeight: 600 }}
                >
                  ✂️ 一键脱敏/替换密钥
                </button>
              </div>
            ) : (
              <p style={{ color: "#10b981", fontWeight: 600, fontSize: "14px", textAlign: "center", paddingTop: "40px" }}>
                ✓ 未检测到明显的硬编码敏感凭据或高熵 API 密钥！
              </p>
            )
          ) : (
            <p style={{ opacity: 0.6, fontSize: "14px", fontStyle: "italic", textAlign: "center", paddingTop: "50px" }}>
              点击“扫描硬编码密钥”查看扫描结果和诊断详情。
            </p>
          )}

          {redactedText && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>脱敏后结果</span>
                <button type="button" onClick={copyRedacted} style={{ padding: "3px 8px", fontSize: "12px" }}>
                  {copied ? "已复制" : "复制脱敏文本"}
                </button>
              </div>
              <textarea
                value={redactedText}
                readOnly
                style={{ minHeight: "150px", fontFamily: "monospace", fontSize: "13px", backgroundColor: "rgba(0,0,0,0.03)" }}
              />
            </div>
          )}
        </div>
      </div>

      {results && (
        <div className="detail-grid" style={{ marginTop: "24px" }}>
          <article className="detail-card">
            <h3>扫描行数</h3>
            <p>{inputText.split("\n").length} 行</p>
          </article>
          <article className="detail-card">
            <h3>检出漏洞级/高危</h3>
            <p style={{ color: results.filter((r) => r.severity === "high").length > 0 ? "#ef4444" : "inherit" }}>
              {results.filter((r) => r.severity === "high").length} 个
            </p>
          </article>
          <article className="detail-card">
            <h3>潜在中危 (高熵)</h3>
            <p style={{ color: results.filter((r) => r.severity === "medium").length > 0 ? "#f59e0b" : "inherit" }}>
              {results.filter((r) => r.severity === "medium").length} 个
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
