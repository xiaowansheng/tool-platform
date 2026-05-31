"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Distribution = "internal" | "saas" | "distributed-closed" | "distributed-open";
type FindingTone = "ok" | "review" | "block";

interface DependencyLicense {
  name: string;
  license: string;
}

interface LicenseFinding {
  dependency: DependencyLicense;
  tone: FindingTone;
  summary: string;
  action: string;
}

const knownLicenses = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MPL-2.0",
  "EPL-2.0",
  "LGPL-2.1-only",
  "LGPL-3.0-only",
  "GPL-2.0-only",
  "GPL-3.0-only",
  "AGPL-3.0-only",
  "SSPL-1.0",
  "Proprietary",
  "UNLICENSED",
  "NOASSERTION"
];

const distributionLabels: Record<Distribution, string> = {
  internal: "内部使用",
  saas: "SaaS / 托管服务",
  "distributed-closed": "闭源分发",
  "distributed-open": "开源分发"
};

const sampleDependencies = "react MIT\nfastify MIT\nreporting-plugin GPL-3.0-only\nnetwork-agent AGPL-3.0-only\nlegacy-sdk NOASSERTION";

function parseDependencies(input: string): DependencyLicense[] {
  return input.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.replace(/[,;]/g, " ");
      const parts = normalized.split(/\s+/);
      const license = parts.at(-1) ?? "NOASSERTION";
      const name = parts.slice(0, -1).join(" ") || "unnamed dependency";

      return { name, license };
    });
}

function licenseFamily(license: string) {
  const normalized = license.toUpperCase();

  if (normalized.includes("AGPL") || normalized.includes("SSPL")) return "network-copyleft";
  if (normalized.includes("GPL")) return "strong-copyleft";
  if (normalized.includes("LGPL") || normalized.includes("MPL") || normalized.includes("EPL")) return "weak-copyleft";
  if (normalized.includes("UNLICENSED") || normalized.includes("PROPRIETARY")) return "restricted";
  if (normalized.includes("NOASSERTION") || normalized.includes("UNKNOWN")) return "unknown";
  if (/MIT|APACHE|BSD|ISC|ZLIB|0BSD/.test(normalized)) return "permissive";
  return "unknown";
}

function assessDependency(projectLicense: string, distribution: Distribution, dependency: DependencyLicense): LicenseFinding {
  const family = licenseFamily(dependency.license);
  const project = projectLicense.toUpperCase();

  if (family === "restricted") {
    return {
      dependency,
      tone: "block",
      summary: "许可证不允许默认再分发或缺少明确授权。",
      action: "确认商业条款、替换依赖或从分发包中移除。"
    };
  }

  if (family === "unknown") {
    return {
      dependency,
      tone: "review",
      summary: "许可证无法自动识别。",
      action: "从包元数据、仓库 LICENSE 和 NOTICE 文件补齐许可证。"
    };
  }

  if (family === "network-copyleft") {
    return {
      dependency,
      tone: distribution === "internal" ? "review" : "block",
      summary: "网络 Copyleft 许可证通常会影响 SaaS 和分发场景。",
      action: "让法务确认服务端源码披露义务，优先寻找替代依赖。"
    };
  }

  if (family === "strong-copyleft" && distribution === "distributed-closed") {
    return {
      dependency,
      tone: "block",
      summary: "强 Copyleft 依赖通常不适合闭源分发。",
      action: "改用兼容许可证、开源对应分发物，或移除该依赖。"
    };
  }

  if (family === "strong-copyleft" && distribution === "saas") {
    return {
      dependency,
      tone: "review",
      summary: "GPL 对纯托管服务通常低于 AGPL 风险，但部署和插件边界需要确认。",
      action: "确认是否存在客户端分发、插件链接或容器镜像交付。"
    };
  }

  if (family === "weak-copyleft" && distribution !== "internal") {
    return {
      dependency,
      tone: "review",
      summary: "弱 Copyleft 依赖通常可用，但修改文件、动态链接和 NOTICE 义务需跟踪。",
      action: "保留许可证文本，记录修改，检查静态链接和再分发方式。"
    };
  }

  if (dependency.license.toUpperCase().includes("APACHE-2") && project.includes("GPL-2.0-ONLY")) {
    return {
      dependency,
      tone: "block",
      summary: "Apache-2.0 与 GPL-2.0-only 通常存在专利条款兼容性问题。",
      action: "改用 GPL-2.0-or-later / GPL-3.0 或替换依赖。"
    };
  }

  return {
    dependency,
    tone: "ok",
    summary: "未发现常见兼容性阻断。",
    action: "保留许可证和 NOTICE，继续按发布清单跟踪。"
  };
}

function toneLabel(tone: FindingTone) {
  if (tone === "block") return "阻断";
  if (tone === "review") return "待审";
  return "通过";
}

export default function LicenseCompatibilityCheckerTool({ manifest }: ToolClientProps) {
  const [projectLicense, setProjectLicense] = useState("Proprietary");
  const [distribution, setDistribution] = useState<Distribution>("distributed-closed");
  const [input, setInput] = useState(sampleDependencies);

  const findings = useMemo(() => {
    return parseDependencies(input).map((dependency) => assessDependency(projectLicense, distribution, dependency));
  }, [distribution, input, projectLicense]);
  const counts = findings.reduce(
    (summary, finding) => ({
      ok: summary.ok + (finding.tone === "ok" ? 1 : 0),
      review: summary.review + (finding.tone === "review" ? 1 : 0),
      block: summary.block + (finding.tone === "block" ? 1 : 0)
    }),
    { ok: 0, review: 0, block: 0 }
  );

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">开源合规</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>项目许可证</span>
          <select value={projectLicense} onChange={(event) => setProjectLicense(event.target.value)}>
            {knownLicenses.map((license) => <option key={license} value={license}>{license}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>分发方式</span>
          <select value={distribution} onChange={(event) => setDistribution(event.target.value as Distribution)}>
            {Object.entries(distributionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <label className="tool-field">
        <span>依赖项</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>通过</h3>
          <p>{counts.ok}</p>
        </article>
        <article className="detail-card">
          <h3>待审</h3>
          <p>{counts.review}</p>
        </article>
        <article className="detail-card">
          <h3>阻断</h3>
          <p>{counts.block}</p>
        </article>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>依赖</span>
          <span>评估</span>
        </div>
        {findings.map((finding) => (
          <div key={`${finding.dependency.name}-${finding.dependency.license}`} className="tool-table__row">
            <span>
              <strong>{finding.dependency.name}</strong><br />
              <span className="mono-output">{finding.dependency.license}</span>
            </span>
            <span>
              <span className="tag">{toneLabel(finding.tone)}</span> {finding.summary}<br />
              {finding.action}
            </span>
          </div>
        ))}
      </div>
      <p className="tool-note">自动结果只覆盖常见 OSS 兼容性规则，不能替代正式法律审查。</p>
    </section>
  );
}
