"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type FindingLevel = "error" | "warning" | "info";

interface ComposeService {
  name: string;
  line: number;
  body: string;
}

interface Finding {
  service: string;
  line: number;
  level: FindingLevel;
  message: string;
}

const sampleCompose = `services:
  web:
    image: ghcr.io/acme/web:1.4.2
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      NODE_ENV: production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
  worker:
    build: .
    restart: on-failure`;

function hasExplicitTag(image: string) {
  const withoutDigest = image.split("@")[0] ?? "";
  const lastSegment = withoutDigest.split("/").pop() ?? "";

  return lastSegment.includes(":");
}

function parseServices(source: string): ComposeService[] {
  const services: ComposeService[] = [];
  const lines = source.split(/\r?\n/);
  let inServices = false;
  let current: { name: string; line: number; body: string[] } | null = null;

  lines.forEach((line, index) => {
    if (/^services:\s*$/.test(line.trim())) {
      inServices = true;
      return;
    }

    if (!inServices) return;

    if (/^[^\s].+:\s*$/.test(line) && !/^services:\s*$/.test(line.trim())) {
      if (current) {
        services.push({ name: current.name, line: current.line, body: current.body.join("\n") });
      }
      current = null;
      inServices = false;
      return;
    }

    const serviceMatch = line.match(/^  ([A-Za-z0-9_.-]+):\s*$/);

    if (serviceMatch) {
      if (current) {
        services.push({ name: current.name, line: current.line, body: current.body.join("\n") });
      }

      current = { name: serviceMatch[1] ?? "", line: index + 1, body: [] };
      return;
    }

    if (current && line.startsWith("    ")) {
      current.body.push(line);
    }
  });

  const trailingService = current as { name: string; line: number; body: string[] } | null;

  if (trailingService) {
    services.push({ name: trailingService.name, line: trailingService.line, body: trailingService.body.join("\n") });
  }

  return services;
}

function validateCompose(source: string) {
  const findings: Finding[] = [];
  const services = parseServices(source);

  if (/^version:\s*/m.test(source)) {
    findings.push({ service: "compose", line: 1, level: "info", message: "Compose Specification 已不需要 version 字段。" });
  }

  if (services.length === 0) {
    findings.push({ service: "compose", line: 1, level: "error", message: "未找到 services 配置。" });
  }

  services.forEach((service) => {
    const body = service.body;
    const imageMatch = body.match(/^\s+image:\s*["']?([^"'\s]+)["']?/m);
    const hasBuild = /^\s+build:/m.test(body);

    if (!imageMatch && !hasBuild) {
      findings.push({ service: service.name, line: service.line, level: "error", message: "服务缺少 image 或 build。" });
    }

    if (imageMatch) {
      const image = imageMatch[1] ?? "";
      if (!hasExplicitTag(image) || image.endsWith(":latest")) {
        findings.push({ service: service.name, line: service.line, level: "warning", message: `镜像 ${image} 未使用稳定版本 tag。` });
      }
    }

    if (/^\s+privileged:\s*true\s*$/m.test(body)) {
      findings.push({ service: service.name, line: service.line, level: "error", message: "privileged: true 会放大容器逃逸风险。" });
    }

    if (/^\s+network_mode:\s*host\s*$/m.test(body)) {
      findings.push({ service: service.name, line: service.line, level: "warning", message: "host 网络会绕过 Compose 网络隔离。" });
    }

    if (/docker\.sock/.test(body)) {
      findings.push({ service: service.name, line: service.line, level: "error", message: "挂载 docker.sock 等同于授予宿主机控制权。" });
    }

    if (/^\s+-\s*"?((0\.0\.0\.0:)?\d+:\d+)/m.test(body)) {
      findings.push({ service: service.name, line: service.line, level: "warning", message: "端口绑定到所有地址，确认是否需要公网暴露。" });
    }

    if (!/^\s+restart:/m.test(body)) {
      findings.push({ service: service.name, line: service.line, level: "info", message: "未配置 restart 策略。" });
    }

    if (!/^\s+healthcheck:/m.test(body)) {
      findings.push({ service: service.name, line: service.line, level: "info", message: "未配置 healthcheck。" });
    }

    if (/\b(PASSWORD|SECRET|TOKEN|API[_-]?KEY)\b\s*[:=]\s*['"]?[^\s'"]+/i.test(body)) {
      findings.push({ service: service.name, line: service.line, level: "warning", message: "environment 中疑似包含明文密钥。" });
    }
  });

  return { services, findings };
}

function countLevel(findings: Finding[], level: FindingLevel) {
  return findings.filter((finding) => finding.level === level).length;
}

export default function DockerComposeValidatorTool({ manifest }: ToolClientProps) {
  const [source, setSource] = useState(sampleCompose);
  const result = useMemo(() => validateCompose(source), [source]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">容器工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>compose.yaml</span>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>服务</h3>
          <p>{result.services.length}</p>
        </article>
        <article className="detail-card">
          <h3>错误</h3>
          <p>{countLevel(result.findings, "error")}</p>
        </article>
        <article className="detail-card">
          <h3>警告</h3>
          <p>{countLevel(result.findings, "warning")}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="Compose 校验结果">
        {result.findings.map((finding, index) => (
          <div
            key={`${finding.service}-${finding.message}-${index}`}
            className={`diff-line diff-line--${finding.level === "error" ? "removed" : finding.level === "warning" ? "added" : "equal"}`}
          >
            <span>{finding.level === "error" ? "!" : finding.level === "warning" ? "~" : "i"}</span>
            <code>{finding.service}: {finding.message}</code>
          </div>
        ))}
      </article>
      <p className="tool-note">当前校验覆盖 Compose 常见部署风险；复杂 YAML anchor/merge 不做完整展开。</p>
    </section>
  );
}
