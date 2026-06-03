"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface AnalysisResult {
  length: number;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  uniqueChars: number;
  poolSize: number;
  entropy: number;
  crackTimeSeconds: number;
  score: number;
  label: string;
  suggestions: string[];
}

function analyzePassword(password: string): AnalysisResult {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigit) poolSize += 10;
  if (hasSymbol) poolSize += 33;

  const uniqueChars = new Set(password).size;
  const entropy = poolSize > 0 ? password.length * Math.log2(poolSize) : 0;

  // Assume 10 billion guesses per second (modern GPU cluster)
  const guessesPerSecond = 1e10;
  const combinations = Math.pow(poolSize, password.length);
  const crackTimeSeconds = combinations / guessesPerSecond / 2;

  let score = 0;
  if (entropy >= 28) score = 1;
  if (entropy >= 36) score = 2;
  if (entropy >= 60) score = 3;
  if (entropy >= 80) score = 4;
  if (entropy >= 100) score = 5;

  // Bonus for diversity
  const types = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (types >= 3 && password.length >= 12) score = Math.min(5, score + 1);

  const labels = ["极弱", "弱", "一般", "较强", "强", "极强"];
  const label = labels[score] ?? "未知";

  const suggestions: string[] = [];
  if (password.length < 8) suggestions.push("增加长度至至少 8 个字符");
  if (password.length < 12) suggestions.push("推荐长度 12 个字符以上");
  if (!hasUpper) suggestions.push("添加大写字母");
  if (!hasLower) suggestions.push("添加小写字母");
  if (!hasDigit) suggestions.push("添加数字");
  if (!hasSymbol) suggestions.push("添加特殊符号（如 !@#$%^&*）");
  if (uniqueChars < password.length * 0.6) suggestions.push("减少重复字符，增加唯一字符数");
  if (/^(123|abc|qwerty|password)/i.test(password)) suggestions.push("避免使用常见密码模式");
  if (suggestions.length === 0) suggestions.push("密码强度良好！");

  return {
    length: password.length,
    hasLower, hasUpper, hasDigit, hasSymbol,
    uniqueChars, poolSize, entropy, crackTimeSeconds,
    score, label, suggestions
  };
}

function formatCrackTime(seconds: number): string {
  if (!isFinite(seconds) || seconds > 3.154e+16) return "数百万年以上";
  if (seconds < 0.001) return "瞬间";
  if (seconds < 1) return "不到 1 秒";
  if (seconds < 60) return `${Math.round(seconds)} 秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} 小时`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} 天`;
  const years = seconds / 31536000;
  if (years < 1000) return `${Math.round(years)} 年`;
  if (years < 1e6) return `${(years / 1000).toFixed(1)} 千年`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} 百万年`;
  return `${(years / 1e9).toFixed(1)} 十亿年`;
}

const scoreColors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#06b6d4"];

export default function PasswordStrengthAnalyzerTool({ manifest }: ToolAppProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const analysis = useMemo(() => analyzePassword(password), [password]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">密码安全</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar" style={{ alignItems: "flex-end" }}>
        <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
          <span>输入密码</span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码以分析强度..."
          />
        </label>
        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ marginBottom: 0 }}>
          {showPassword ? "隐藏" : "显示"}
        </button>
      </div>

      {/* Strength bar */}
      <div style={{
        height: "8px",
        background: "var(--border, #333)",
        borderRadius: "4px",
        overflow: "hidden",
        margin: "12px 0"
      }}>
        <div style={{
          height: "100%",
          width: `${(analysis.score / 5) * 100}%`,
          background: scoreColors[analysis.score],
          transition: "all 0.3s ease",
          borderRadius: "4px"
        }} />
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>强度评级</h3>
          <p style={{ color: scoreColors[analysis.score], fontWeight: "bold", fontSize: "1.2em" }}>
            {password ? analysis.label : "-"}
          </p>
        </article>
        <article className="detail-card">
          <h3>暴力破解时间</h3>
          <p>{password ? formatCrackTime(analysis.crackTimeSeconds) : "-"}</p>
        </article>
        <article className="detail-card">
          <h3>熵</h3>
          <p>{password ? `${analysis.entropy.toFixed(1)} 位` : "-"}</p>
        </article>
        <article className="detail-card">
          <h3>字符池</h3>
          <p>{password ? `${analysis.poolSize} 种字符` : "-"}</p>
        </article>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>长度</h3>
          <p>{analysis.length}</p>
        </article>
        <article className="detail-card">
          <h3>唯一字符</h3>
          <p>{analysis.uniqueChars}</p>
        </article>
        <article className="detail-card">
          <h3>大写</h3>
          <p>{analysis.hasUpper ? "是" : "否"}</p>
        </article>
        <article className="detail-card">
          <h3>小写</h3>
          <p>{analysis.hasLower ? "是" : "否"}</p>
        </article>
        <article className="detail-card">
          <h3>数字</h3>
          <p>{analysis.hasDigit ? "是" : "否"}</p>
        </article>
        <article className="detail-card">
          <h3>符号</h3>
          <p>{analysis.hasSymbol ? "是" : "否"}</p>
        </article>
      </div>

      {password && analysis.suggestions.length > 0 ? (
        <label className="tool-field">
          <span>改进建议</span>
          <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
            {analysis.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </label>
      ) : null}

      <p className="tool-note">
        破解时间基于每秒 100 亿次猜测估算（现代 GPU 集群水平）。实际安全性还取决于哈希算法、盐值、限速策略等因素。所有分析在浏览器本地完成。
      </p>
    </section>
  );
}
