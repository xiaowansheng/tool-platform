"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type FindingLevel = "error" | "warning" | "info";

interface Finding {
  line: number;
  level: FindingLevel;
  message: string;
  recommendation: string;
}

const sampleDockerfile = `FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
USER node
EXPOSE 3000
CMD ["node", "server.js"]`;

function hasExplicitTag(image: string) {
  const withoutDigest = image.split("@")[0] ?? "";
  const lastSegment = withoutDigest.split("/").pop() ?? "";

  return lastSegment.includes(":");
}

function createFinding(line: number, level: FindingLevel, message: string, recommendation: string): Finding {
  return { line, level, message, recommendation };
}

function lintDockerfile(source: string) {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  let hasFrom = false;
  let hasUser = false;
  let hasHealthcheck = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const instruction = trimmed.split(/\s+/)[0]?.toUpperCase() ?? "";

    if (instruction === "FROM") {
      hasFrom = true;
      const image = trimmed.slice(4).trim().split(/\s+AS\s+/i)[0]?.trim() ?? "";

      if (!hasExplicitTag(image)) {
        findings.push(createFinding(lineNumber, "warning", "基础镜像没有显式 tag", "为镜像指定版本 tag，避免构建结果随上游 latest 漂移。"));
      }

      if (/:latest(?:@|$)/.test(image) || image.endsWith(":latest")) {
        findings.push(createFinding(lineNumber, "warning", "基础镜像使用 latest", "改用具体版本，生产镜像可进一步 pin 到 digest。"));
      }

      if (!image.includes("@sha256:")) {
        findings.push(createFinding(lineNumber, "info", "基础镜像未 pin digest", "高安全场景建议使用 image:tag@sha256:... 固定供应链输入。"));
      }
    }

    if (instruction === "RUN") {
      if (/\b(curl|wget)\b.+\|\s*(sh|bash)\b/i.test(trimmed)) {
        findings.push(createFinding(lineNumber, "error", "下载脚本后直接执行", "先校验 checksum 或签名，再以固定版本安装依赖。"));
      }

      if (/apt-get\s+install/i.test(trimmed) && !/rm\s+-rf\s+\/var\/lib\/apt\/lists/i.test(trimmed)) {
        findings.push(createFinding(lineNumber, "warning", "apt 缓存未清理", "同一 RUN 中执行 rm -rf /var/lib/apt/lists/* 以缩小镜像体积。"));
      }

      if (/apk\s+add/i.test(trimmed) && !/--no-cache/.test(trimmed)) {
        findings.push(createFinding(lineNumber, "warning", "apk add 缺少 --no-cache", "使用 apk add --no-cache 避免缓存进入镜像层。"));
      }

      if (/chmod\s+777/.test(trimmed)) {
        findings.push(createFinding(lineNumber, "warning", "权限设置过宽", "用最小可用权限替代 chmod 777。"));
      }
    }

    if (instruction === "ADD") {
      const usesRemote = /\shttps?:\/\//i.test(trimmed);
      findings.push(createFinding(
        lineNumber,
        usesRemote ? "error" : "warning",
        usesRemote ? "ADD 从远程 URL 拉取内容" : "可用 COPY 替代 ADD",
        usesRemote ? "远程下载应放入可校验的 RUN 步骤。" : "没有自动解压需求时使用 COPY，语义更清晰。"
      ));
    }

    if (instruction === "ENV" && /\b(PASSWORD|SECRET|TOKEN|API[_-]?KEY|ACCESS[_-]?KEY)\b/i.test(trimmed)) {
      findings.push(createFinding(lineNumber, "error", "ENV 中疑似包含密钥", "不要把密钥写入镜像层，改用运行时 secret 或环境注入。"));
    }

    if (instruction === "USER") {
      hasUser = true;
      if (/\b(root|0)\b/i.test(trimmed)) {
        findings.push(createFinding(lineNumber, "warning", "容器显式使用 root 用户", "创建并切换到非 root 用户运行应用。"));
      }
    }

    if (instruction === "HEALTHCHECK") {
      hasHealthcheck = true;
    }
  });

  if (!hasFrom) {
    findings.push(createFinding(1, "error", "缺少 FROM 指令", "Dockerfile 必须声明基础镜像。"));
  }

  if (!hasUser) {
    findings.push(createFinding(1, "warning", "缺少 USER 指令", "生产镜像建议切换到非 root 用户。"));
  }

  if (!hasHealthcheck) {
    findings.push(createFinding(1, "info", "缺少 HEALTHCHECK", "服务型容器可以补充健康检查，方便编排器判断实例状态。"));
  }

  return findings;
}

function summarize(findings: Finding[]) {
  return findings.reduce(
    (summary, finding) => ({
      errors: summary.errors + (finding.level === "error" ? 1 : 0),
      warnings: summary.warnings + (finding.level === "warning" ? 1 : 0),
      info: summary.info + (finding.level === "info" ? 1 : 0)
    }),
    { errors: 0, warnings: 0, info: 0 }
  );
}

export default function DockerfileLinterTool({ manifest }: ToolClientProps) {
  const [source, setSource] = useState(sampleDockerfile);
  const findings = useMemo(() => lintDockerfile(source), [source]);
  const summary = summarize(findings);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Container Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>Dockerfile</span>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>Errors</h3>
          <p>{summary.errors}</p>
        </article>
        <article className="detail-card">
          <h3>Warnings</h3>
          <p>{summary.warnings}</p>
        </article>
        <article className="detail-card">
          <h3>Info</h3>
          <p>{summary.info}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="Dockerfile lint findings">
        {findings.map((finding, index) => (
          <div
            key={`${finding.line}-${finding.message}-${index}`}
            className={`diff-line diff-line--${finding.level === "error" ? "removed" : finding.level === "warning" ? "added" : "equal"}`}
          >
            <span>{finding.level === "error" ? "!" : finding.level === "warning" ? "~" : "i"}</span>
            <code>line {finding.line}: {finding.message} - {finding.recommendation}</code>
          </div>
        ))}
      </article>
      <p className="tool-note">这是面向常见生产风险的静态检查，不会执行 Docker build。</p>
    </section>
  );
}
