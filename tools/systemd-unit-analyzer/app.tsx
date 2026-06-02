"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Finding {
  tone: "ok" | "warn" | "risk";
  title: string;
  detail: string;
  recommendation: string;
}

const sampleUnit = `[Unit]
Description=Example API service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=app
WorkingDirectory=/srv/example
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5s
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target`;

function parseUnit(source: string) {
  const sections = new Map<string, Map<string, string[]>>();
  let current = "";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line.startsWith(";")) {
      continue;
    }

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);

    if (sectionMatch) {
      current = sectionMatch[1];
      sections.set(current, sections.get(current) ?? new Map());
      continue;
    }

    const equalsIndex = line.indexOf("=");

    if (equalsIndex > 0 && current) {
      const key = line.slice(0, equalsIndex);
      const value = line.slice(equalsIndex + 1);
      const section = sections.get(current) ?? new Map();
      const values = section.get(key) ?? [];

      values.push(value);
      section.set(key, values);
      sections.set(current, section);
    }
  }

  return sections;
}

function getValue(sections: Map<string, Map<string, string[]>>, section: string, key: string) {
  return sections.get(section)?.get(key)?.at(-1) ?? "";
}

function hasKey(sections: Map<string, Map<string, string[]>>, section: string, key: string) {
  return Boolean(sections.get(section)?.has(key));
}

function analyzeUnit(source: string) {
  const sections = parseUnit(source);
  const findings: Finding[] = [];
  const service = sections.get("Service");

  if (!service) {
    findings.push({
      tone: "risk",
      title: "缺少 [Service]",
      detail: "没有 service section，systemd 无法知道要启动什么进程。",
      recommendation: "补充 [Service]、ExecStart 和必要的运行用户。"
    });
  }

  const execStart = getValue(sections, "Service", "ExecStart");

  findings.push(execStart ? {
    tone: "ok",
    title: "ExecStart 已配置",
    detail: execStart,
    recommendation: "确认命令使用绝对路径，并避免把密钥直接写进启动参数。"
  } : {
    tone: "risk",
    title: "缺少 ExecStart",
    detail: "service 没有启动命令。",
    recommendation: "设置 ExecStart=/path/to/binary 或脚本入口。"
  });

  const user = getValue(sections, "Service", "User");

  findings.push(user && user !== "root" ? {
    tone: "ok",
    title: "使用非 root 用户",
    detail: `User=${user}`,
    recommendation: "确认该用户只拥有服务所需目录和端口权限。"
  } : {
    tone: "risk",
    title: "可能以 root 运行",
    detail: user ? "User=root" : "未设置 User",
    recommendation: "为服务创建专用低权限用户，并设置 User=。"
  });

  const restart = getValue(sections, "Service", "Restart");

  findings.push(restart ? {
    tone: restart === "always" ? "warn" : "ok",
    title: "重启策略已配置",
    detail: `Restart=${restart}`,
    recommendation: restart === "always" ? "确认不会掩盖配置错误；可结合 StartLimitIntervalSec 和 StartLimitBurst。" : "适合常见服务故障恢复。"
  } : {
    tone: "warn",
    title: "缺少 Restart",
    detail: "进程退出后不会自动恢复。",
    recommendation: "对长期服务通常设置 Restart=on-failure。"
  });

  const hardeningChecks = [
    ["NoNewPrivileges", "true", "阻止进程获得新权限"],
    ["PrivateTmp", "true", "隔离 /tmp"],
    ["ProtectSystem", "strict", "限制系统目录写入"],
    ["ProtectHome", "true", "限制访问用户 home"],
    ["ReadWritePaths", "", "显式声明可写目录"]
  ] as const;

  for (const [key, expected, description] of hardeningChecks) {
    const value = getValue(sections, "Service", key);

    findings.push(value ? {
      tone: expected && value.toLowerCase() !== expected ? "warn" : "ok",
      title: `${key} 已配置`,
      detail: `${key}=${value}`,
      recommendation: description
    } : {
      tone: key === "ReadWritePaths" ? "warn" : "risk",
      title: `缺少 ${key}`,
      detail: description,
      recommendation: expected ? `考虑设置 ${key}=${expected}` : "在 ProtectSystem=strict 时补充服务必须写入的目录。"
    });
  }

  if (!hasKey(sections, "Install", "WantedBy")) {
    findings.push({
      tone: "warn",
      title: "缺少 WantedBy",
      detail: "unit 可能无法通过 enable 挂到常用 target。",
      recommendation: "服务类 unit 通常设置 WantedBy=multi-user.target。"
    });
  }

  return {
    sections,
    findings,
    summary: {
      ok: findings.filter((finding) => finding.tone === "ok").length,
      warn: findings.filter((finding) => finding.tone === "warn").length,
      risk: findings.filter((finding) => finding.tone === "risk").length
    }
  };
}

function buildHardeningSnippet() {
  return `[Service]
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/YOUR_SERVICE /var/log/YOUR_SERVICE
Restart=on-failure
RestartSec=5s
StartLimitIntervalSec=60
StartLimitBurst=5`;
}

export default function SystemdUnitAnalyzerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleUnit);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const analysis = useMemo(() => analyzeUnit(input), [input]);
  const snippet = buildHardeningSnippet();

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Linux 运维</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => setInput(sampleUnit)}>加载示例</button>
        <button type="button" onClick={() => void copySnippet()}>{copied ? "已复制" : "复制加固片段"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>通过</h3>
          <p>{analysis.summary.ok}</p>
        </article>
        <article className="detail-card">
          <h3>警告</h3>
          <p>{analysis.summary.warn}</p>
        </article>
        <article className="detail-card">
          <h3>风险</h3>
          <p>{analysis.summary.risk}</p>
        </article>
        <article className="detail-card">
          <h3>段落</h3>
          <p>{analysis.sections.size}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Unit 文件</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>

        <div className="workspace workspace--stack">
          {analysis.findings.map((finding) => (
            <article className="detail-card" key={`${finding.title}-${finding.detail}`}>
              <h3>{finding.tone.toUpperCase()} · {finding.title}</h3>
              <p>{finding.detail}</p>
              <div className="mono-output">{finding.recommendation}</div>
            </article>
          ))}
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">本工具做静态配置检查，不能替代 `systemd-analyze verify`、实际启动测试和发行版安全基线。</p>
    </section>
  );
}
