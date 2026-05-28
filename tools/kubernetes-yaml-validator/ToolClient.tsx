"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type FindingLevel = "error" | "warning" | "info";

interface ResourceDoc {
  index: number;
  source: string;
  apiVersion: string;
  kind: string;
  name: string;
}

interface Finding {
  resource: string;
  level: FindingLevel;
  message: string;
}

const sampleManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.8.0
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080`;

function scalar(source: string, key: string) {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*([^\\n#]+)`, "m"));

  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function metadataName(source: string) {
  const lines = source.split(/\r?\n/);
  let metadataIndent = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.match(/^\s*/)?.[0].length ?? 0;

    if (metadataIndent >= 0 && indent <= metadataIndent) {
      break;
    }

    if (metadataIndent >= 0) {
      const match = line.match(/^\s*name:\s*([^\n#]+)/);
      if (match) return match[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
      continue;
    }

    if (/^metadata:\s*$/.test(trimmed)) {
      metadataIndent = indent;
    }
  }

  return "";
}

function parseDocuments(source: string): ResourceDoc[] {
  return source
    .split(/^---\s*$/m)
    .map((doc) => doc.trim())
    .filter(Boolean)
    .map((doc, index) => ({
      index: index + 1,
      source: doc,
      apiVersion: scalar(doc, "apiVersion"),
      kind: scalar(doc, "kind"),
      name: metadataName(doc)
    }));
}

function hasStableImageTag(image: string) {
  const withoutDigest = image.split("@")[0] ?? "";
  const lastSegment = withoutDigest.split("/").pop() ?? "";

  return lastSegment.includes(":") && !lastSegment.endsWith(":latest");
}

function extractImages(source: string) {
  return Array.from(source.matchAll(/^\s*image:\s*["']?([^"'\s]+)["']?/gm)).map((match) => match[1] ?? "");
}

function validateKubernetes(source: string) {
  const resources = parseDocuments(source);
  const findings: Finding[] = [];

  if (resources.length === 0) {
    findings.push({ resource: "manifest", level: "error", message: "未找到可校验的 YAML document。" });
  }

  resources.forEach((resource) => {
    const label = `${resource.kind || "Unknown"}/${resource.name || `document-${resource.index}`}`;

    if (!resource.apiVersion) {
      findings.push({ resource: label, level: "error", message: "缺少 apiVersion。" });
    }

    if (!resource.kind) {
      findings.push({ resource: label, level: "error", message: "缺少 kind。" });
    }

    if (!resource.name) {
      findings.push({ resource: label, level: "error", message: "缺少 metadata.name。" });
    }

    extractImages(resource.source).forEach((image) => {
      if (!hasStableImageTag(image)) {
        findings.push({ resource: label, level: "warning", message: `镜像 ${image} 未使用稳定 tag。` });
      }
    });

    if (["Deployment", "StatefulSet", "DaemonSet"].includes(resource.kind)) {
      if (!/^\s*selector:\s*$/m.test(resource.source)) {
        findings.push({ resource: label, level: "error", message: "workload 缺少 spec.selector。" });
      }

      if (!/^\s*template:\s*$/m.test(resource.source)) {
        findings.push({ resource: label, level: "error", message: "workload 缺少 pod template。" });
      }

      if (!/^\s*resources:\s*$/m.test(resource.source)) {
        findings.push({ resource: label, level: "warning", message: "容器未声明 resources requests/limits。" });
      } else {
        if (!/^\s*requests:\s*$/m.test(resource.source)) {
          findings.push({ resource: label, level: "warning", message: "resources 缺少 requests。" });
        }

        if (!/^\s*limits:\s*$/m.test(resource.source)) {
          findings.push({ resource: label, level: "warning", message: "resources 缺少 limits。" });
        }
      }

      if (!/^\s*readinessProbe:\s*$/m.test(resource.source)) {
        findings.push({ resource: label, level: "info", message: "未配置 readinessProbe。" });
      }

      if (!/^\s*livenessProbe:\s*$/m.test(resource.source)) {
        findings.push({ resource: label, level: "info", message: "未配置 livenessProbe。" });
      }

      if (!/^\s*runAsNonRoot:\s*true\s*$/m.test(resource.source)) {
        findings.push({ resource: label, level: "info", message: "未声明 runAsNonRoot: true。" });
      }
    }

    if (resource.kind === "Service" && /^\s*type:\s*(NodePort|LoadBalancer)\s*$/m.test(resource.source)) {
      findings.push({ resource: label, level: "warning", message: "Service 会暴露到集群外，确认访问面和防火墙策略。" });
    }

    if (!/^\s*namespace:\s*.+$/m.test(resource.source) && !["Namespace", "ClusterRole", "ClusterRoleBinding"].includes(resource.kind)) {
      findings.push({ resource: label, level: "info", message: "未声明 namespace，将落到 kubectl 当前上下文。" });
    }
  });

  return { resources, findings };
}

function countLevel(findings: Finding[], level: FindingLevel) {
  return findings.filter((finding) => finding.level === level).length;
}

export default function KubernetesYamlValidatorTool({ manifest }: ToolClientProps) {
  const [source, setSource] = useState(sampleManifest);
  const result = useMemo(() => validateKubernetes(source), [source]);
  const kinds = Array.from(new Set(result.resources.map((resource) => resource.kind).filter(Boolean))).join(" / ") || "none";

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Kubernetes Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>Kubernetes YAML</span>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>Resources</h3>
          <p>{result.resources.length}</p>
        </article>
        <article className="detail-card">
          <h3>Kinds</h3>
          <p>{kinds}</p>
        </article>
        <article className="detail-card">
          <h3>Errors</h3>
          <p>{countLevel(result.findings, "error")}</p>
        </article>
        <article className="detail-card">
          <h3>Warnings</h3>
          <p>{countLevel(result.findings, "warning")}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="Kubernetes validation findings">
        {result.findings.map((finding, index) => (
          <div
            key={`${finding.resource}-${finding.message}-${index}`}
            className={`diff-line diff-line--${finding.level === "error" ? "removed" : finding.level === "warning" ? "added" : "equal"}`}
          >
            <span>{finding.level === "error" ? "!" : finding.level === "warning" ? "~" : "i"}</span>
            <code>{finding.resource}: {finding.message}</code>
          </div>
        ))}
      </article>
      <p className="tool-note">此工具做 manifest 静态体检，不替代 kube-apiserver schema 校验或 admission policy。</p>
    </section>
  );
}
