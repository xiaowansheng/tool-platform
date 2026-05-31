"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type RiskLevel = "low" | "medium" | "high";

interface DependencyRecord {
  name: string;
  version: string;
  group: string;
}

interface RiskSignal {
  level: RiskLevel;
  message: string;
}

interface DependencyRisk {
  dependency: DependencyRecord;
  level: RiskLevel;
  score: number;
  signals: RiskSignal[];
}

const samplePackage = JSON.stringify({
  dependencies: {
    "left-pad": "*",
    "legacy-auth": "0.8.1",
    "download-helper": "github:example/download-helper",
    "react": "^19.0.0"
  },
  devDependencies: {
    "build-plugin": "1.0.0-beta.2"
  },
  scripts: {
    postinstall: "node scripts/bootstrap.js"
  }
}, null, 2);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePackageJson(input: string) {
  const parsed = JSON.parse(input) as unknown;
  if (!isRecord(parsed)) throw new Error("package.json 顶层必须是对象");

  const dependencies: DependencyRecord[] = [];
  const groups = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const;

  for (const group of groups) {
    const section = parsed[group];
    if (!isRecord(section)) continue;

    for (const [name, version] of Object.entries(section)) {
      dependencies.push({
        name,
        version: typeof version === "string" ? version : "unknown",
        group
      });
    }
  }

  const scripts = isRecord(parsed.scripts) ? parsed.scripts : {};
  for (const scriptName of ["preinstall", "install", "postinstall", "prepare"]) {
    if (typeof scripts[scriptName] === "string") {
      dependencies.push({
        name: `package script: ${scriptName}`,
        version: scripts[scriptName],
        group: "lifecycle"
      });
    }
  }

  return dependencies;
}

function parseDependencyLines(input: string) {
  return input.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): DependencyRecord => {
      const match = line.match(/^(@?[^@\s]+(?:\/[^@\s]+)?)(?:@|\s+)(.+)$/);

      return {
        name: match?.[1] ?? line,
        version: match?.[2] ?? "unknown",
        group: "manual"
      };
    });
}

function parseDependencies(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{")) return parsePackageJson(trimmed);
  return parseDependencyLines(trimmed);
}

function addSignal(signals: RiskSignal[], level: RiskLevel, message: string) {
  signals.push({ level, message });
}

function analyzeDependency(dependency: DependencyRecord): DependencyRisk {
  const signals: RiskSignal[] = [];
  const version = dependency.version.trim();
  const lowerVersion = version.toLowerCase();
  const name = dependency.name.toLowerCase();

  if (dependency.group === "lifecycle") {
    addSignal(signals, "high", "安装生命周期脚本会在 install 阶段执行本地命令。");
  }

  if (!version || lowerVersion === "unknown" || lowerVersion === "latest" || version === "*" || /^[xX]$/.test(version)) {
    addSignal(signals, "high", "版本未固定，供应链漂移风险高。");
  } else if (/^[~^]/.test(version)) {
    addSignal(signals, "low", "SemVer 范围允许自动升级，发布前应依赖锁文件。");
  } else if (/[<>]=?|\|\|/.test(version)) {
    addSignal(signals, "medium", "复杂版本范围会扩大解析结果，建议收敛到明确版本。");
  }

  if (/^(git|github|git\+|https?:|file:)/i.test(version)) {
    addSignal(signals, version.startsWith("file:") ? "medium" : "high", "非 registry 来源依赖更难复现和审计。");
  }

  if (/^0\.\d+\.\d+/.test(version.replace(/^[~^]/, ""))) {
    addSignal(signals, "medium", "0.x 版本 API 和安全修复节奏通常更不稳定。");
  }

  if (/(alpha|beta|rc|snapshot|canary|next)/i.test(version)) {
    addSignal(signals, "medium", "预发布版本不适合默认进入生产依赖树。");
  }

  if (/(crypto|auth|jwt|session|password|secret|shell|exec|download|install)/.test(name)) {
    addSignal(signals, "medium", "依赖处于安全敏感路径，升级和替换需要更严格审查。");
  }

  if (dependency.group === "optionalDependencies") {
    addSignal(signals, "low", "optionalDependencies 可能因平台差异产生未覆盖路径。");
  }

  if (signals.length === 0) {
    addSignal(signals, "low", "未发现明显供应链风险信号。");
  }

  const score = signals.reduce((total, signal) => total + (signal.level === "high" ? 3 : signal.level === "medium" ? 2 : 1), 0);
  const level: RiskLevel = signals.some((signal) => signal.level === "high") || score >= 5
    ? "high"
    : score >= 3
      ? "medium"
      : "low";

  return { dependency, level, score, signals };
}

function levelLabel(level: RiskLevel) {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "低";
}

export default function DependencyRiskExplainerTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(samplePackage);
  const [minimumLevel, setMinimumLevel] = useState<RiskLevel>("low");
  const levelOrder: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };

  const analysis = useMemo(() => {
    try {
      const dependencies = parseDependencies(input);
      return { risks: dependencies.map(analyzeDependency), error: "" };
    } catch (error) {
      return { risks: [], error: error instanceof Error ? error.message : "依赖清单解析失败" };
    }
  }, [input]);
  const visibleRisks = analysis.risks.filter((risk) => levelOrder[risk.level] >= levelOrder[minimumLevel]);
  const counts = analysis.risks.reduce(
    (summary, risk) => ({
      high: summary.high + (risk.level === "high" ? 1 : 0),
      medium: summary.medium + (risk.level === "medium" ? 1 : 0),
      low: summary.low + (risk.level === "low" ? 1 : 0)
    }),
    { high: 0, medium: 0, low: 0 }
  );

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">供应链风险</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>最低风险等级</span>
          <select value={minimumLevel} onChange={(event) => setMinimumLevel(event.target.value as RiskLevel)}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>
      </div>

      <label className="tool-field">
        <span>依赖列表或 package.json</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>

      {analysis.error ? <p className="tool-error">{analysis.error}</p> : null}

      <div className="detail-grid">
        <article className="detail-card">
          <h3>高风险</h3>
          <p>{counts.high}</p>
        </article>
        <article className="detail-card">
          <h3>中风险</h3>
          <p>{counts.medium}</p>
        </article>
        <article className="detail-card">
          <h3>低风险</h3>
          <p>{counts.low}</p>
        </article>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>依赖</span>
          <span>解释</span>
        </div>
        {visibleRisks.map((risk) => (
          <div key={`${risk.dependency.group}-${risk.dependency.name}`} className="tool-table__row">
            <span>
              <strong>{risk.dependency.name}</strong><br />
              <span className="mono-output">{risk.dependency.version}</span><br />
              <span className="tag">{risk.dependency.group}</span>
            </span>
            <span>
              <span className="tag">{levelLabel(risk.level)} / {risk.score}</span>
              <ul className="compact-list">
                {risk.signals.map((signal) => (
                  <li key={`${risk.dependency.name}-${signal.message}`}>{signal.message}</li>
                ))}
              </ul>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
