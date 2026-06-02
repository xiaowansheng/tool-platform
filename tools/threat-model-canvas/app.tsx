"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type CanvasField = "assets" | "actors" | "entryPoints" | "trustBoundaries" | "dataFlows" | "assumptions" | "controls";
type StrideKey = "spoofing" | "tampering" | "repudiation" | "informationDisclosure" | "denialOfService" | "elevationOfPrivilege";

const fieldLabels: Record<CanvasField, string> = {
  assets: "Assets",
  actors: "Actors",
  entryPoints: "Entry points",
  trustBoundaries: "Trust boundaries",
  dataFlows: "Data flows",
  assumptions: "Assumptions",
  controls: "Controls"
};

const strideLabels: Record<StrideKey, string> = {
  spoofing: "Spoofing",
  tampering: "Tampering",
  repudiation: "Repudiation",
  informationDisclosure: "Information Disclosure",
  denialOfService: "Denial of Service",
  elevationOfPrivilege: "Elevation of Privilege"
};

const stridePrompts: Record<StrideKey, string> = {
  spoofing: "身份、Token、Webhook 签名和服务间认证是否可被伪造。",
  tampering: "请求参数、队列消息、配置和对象存储内容是否可被篡改。",
  repudiation: "关键操作是否有不可抵赖的审计日志、请求 ID 和操作者记录。",
  informationDisclosure: "日志、错误、缓存、导出文件和跨租户查询是否泄露数据。",
  denialOfService: "入口是否存在大请求、慢查询、批处理放大和资源耗尽路径。",
  elevationOfPrivilege: "角色、租户边界、管理端点和后台任务是否可能越权。"
};

const initialFields: Record<CanvasField, string> = {
  assets: "User profiles\nOAuth tokens\nBilling records",
  actors: "End user\nAdmin\nPayment provider\nBackground worker",
  entryPoints: "POST /api/session\nWebhook /billing/events\nAdmin dashboard",
  trustBoundaries: "Browser to API\nAPI to database\nPublic webhook to backend",
  dataFlows: "Browser -> API -> database\nProvider -> webhook -> queue -> worker",
  assumptions: "All admin users use SSO\nWebhook provider signs every request",
  controls: "MFA for admins\nHMAC webhook verification\nStructured audit log"
};

const initialStride: Record<StrideKey, boolean> = {
  spoofing: true,
  tampering: true,
  repudiation: false,
  informationDisclosure: true,
  denialOfService: false,
  elevationOfPrivilege: true
};

function splitLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function buildSuggestions(fields: Record<CanvasField, string>, stride: Record<StrideKey, boolean>) {
  const suggestions: string[] = [];
  const entryPoints = splitLines(fields.entryPoints);
  const trustBoundaries = splitLines(fields.trustBoundaries);
  const controls = fields.controls.toLowerCase();

  for (const key of Object.keys(stride) as StrideKey[]) {
    if (stride[key]) suggestions.push(`${strideLabels[key]}: ${stridePrompts[key]}`);
  }

  if (entryPoints.some((entry) => /webhook/i.test(entry)) && !/signature|hmac|verify/.test(controls)) {
    suggestions.push("Webhook: 增加签名校验、重放保护和时间戳窗口。");
  }

  if (trustBoundaries.length > 0 && !/audit|log/.test(controls)) {
    suggestions.push("Trust boundary: 在跨边界请求上增加请求 ID、审计日志和拒绝原因。");
  }

  if (entryPoints.some((entry) => /admin/i.test(entry)) && !/mfa|sso|role|rbac/.test(controls)) {
    suggestions.push("Admin: 明确 MFA、RBAC 和高危操作二次确认。");
  }

  return suggestions;
}

function buildReport(fields: Record<CanvasField, string>, stride: Record<StrideKey, boolean>, suggestions: string[]) {
  const activeStride = (Object.keys(stride) as StrideKey[]).filter((key) => stride[key]).map((key) => strideLabels[key]);

  return [
    "# Threat Model Canvas",
    "",
    "## Assets",
    fields.assets,
    "",
    "## Actors",
    fields.actors,
    "",
    "## Entry Points",
    fields.entryPoints,
    "",
    "## Trust Boundaries",
    fields.trustBoundaries,
    "",
    "## Data Flows",
    fields.dataFlows,
    "",
    "## STRIDE Focus",
    activeStride.map((item) => `- ${item}`).join("\n") || "- None",
    "",
    "## Existing Controls",
    fields.controls,
    "",
    "## Assumptions",
    fields.assumptions,
    "",
    "## Review Prompts",
    suggestions.map((item) => `- ${item}`).join("\n")
  ].join("\n");
}

export default function ThreatModelCanvasTool({ manifest }: ToolAppProps) {
  const [fields, setFields] = useState(initialFields);
  const [stride, setStride] = useState(initialStride);
  const [copied, setCopied] = useState(false);
  const suggestions = useMemo(() => buildSuggestions(fields, stride), [fields, stride]);
  const report = useMemo(() => buildReport(fields, stride, suggestions), [fields, stride, suggestions]);

  function updateField(key: CanvasField, value: string) {
    setCopied(false);
    setFields((current) => ({ ...current, [key]: value }));
  }

  function updateStride(key: StrideKey, value: boolean) {
    setCopied(false);
    setStride((current) => ({ ...current, [key]: value }));
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">安全架构</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-option-list">
        {(Object.keys(strideLabels) as StrideKey[]).map((key) => (
          <label key={key} className="tool-check">
            <input type="checkbox" checked={stride[key]} onChange={(event) => updateStride(key, event.target.checked)} />
            <span>{strideLabels[key]}</span>
          </label>
        ))}
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyReport()}>{copied ? "已复制" : "复制 Markdown"}</button>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        {(Object.keys(fieldLabels) as CanvasField[]).map((key) => (
          <label key={key} className="tool-field">
            <span>{fieldLabels[key]}</span>
            <textarea value={fields[key]} onChange={(event) => updateField(key, event.target.value)} spellCheck={false} />
          </label>
        ))}
      </div>

      <div className="workspace workspace--two-column">
        <div className="detail-card">
          <h3>复查提示</h3>
          <ul className="compact-list">
            {suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </div>
        <label className="tool-field">
          <span>Markdown 报告</span>
          <textarea value={report} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
