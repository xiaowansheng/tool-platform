"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function CspGeneratorTool({ manifest }: ToolClientProps) {
  const [defaultSrc, setDefaultSrc] = useState("'self'");
  const [scriptSrc, setScriptSrc] = useState("'self'");
  const [styleSrc, setStyleSrc] = useState("'self' 'unsafe-inline'");
  const [imgSrc, setImgSrc] = useState("'self' data: https:");
  const [connectSrc, setConnectSrc] = useState("'self'");
  const [frameAncestors, setFrameAncestors] = useState("'none'");
  const [copied, setCopied] = useState(false);
  const directiveFields: Array<{
    label: string;
    helper: string;
    value: string;
    setValue: (next: string) => void;
  }> = [
    { label: "default-src", helper: "默认兜底来源", value: defaultSrc, setValue: setDefaultSrc },
    { label: "script-src", helper: "脚本来源", value: scriptSrc, setValue: setScriptSrc },
    { label: "style-src", helper: "样式来源", value: styleSrc, setValue: setStyleSrc },
    { label: "img-src", helper: "图片来源", value: imgSrc, setValue: setImgSrc },
    { label: "connect-src", helper: "接口/WebSocket 来源", value: connectSrc, setValue: setConnectSrc },
    { label: "frame-ancestors", helper: "允许被谁嵌入", value: frameAncestors, setValue: setFrameAncestors }
  ];
  const directives = [
    "default-src " + defaultSrc,
    "script-src " + scriptSrc,
    "style-src " + styleSrc,
    "img-src " + imgSrc,
    "connect-src " + connectSrc,
    "frame-ancestors " + frameAncestors,
    "base-uri 'self'",
    "object-src 'none'"
  ];
  const policy = directives.join("; ");
  const header = "Content-Security-Policy: " + policy;
  const hints = [
    scriptSrc.includes("'unsafe-inline'") ? "script-src 包含 unsafe-inline，建议仅在迁移期使用。" : "",
    scriptSrc.includes("*") ? "script-src 使用通配符会显著放大脚本注入风险。" : "",
    frameAncestors !== "'none'" ? "允许 iframe 嵌入时需要确认点击劫持风险。" : "",
    !defaultSrc.trim() ? "default-src 为空，建议至少设置 'self'。" : ""
  ].filter(Boolean);

  async function copyPolicy() {
    await navigator.clipboard.writeText(header);
    setCopied(true);
  }

  function updateField(setValue: (next: string) => void, value: string) {
    setValue(value);
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">安全响应头</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        {directiveFields.map((field) => (
          <label key={field.label} className="tool-field tool-field--compact">
            <span>{field.label} · {field.helper}</span>
            <input value={field.value} onChange={(event) => updateField(field.setValue, event.target.value)} spellCheck={false} />
          </label>
        ))}
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>指令数</h3>
          <p>{directives.length}</p>
        </article>
        <article className="detail-card">
          <h3>Header 长度</h3>
          <p>{header.length}</p>
        </article>
        <article className="detail-card">
          <h3>风险提示</h3>
          <p>{hints.length}</p>
        </article>
      </div>
      <div className="tool-toolbar"><button type="button" className="button--primary" onClick={() => void copyPolicy()}>{copied ? "已复制 Header" : "复制 Header"}</button></div>
      <label className="tool-field"><span>CSP Header</span><textarea value={header} readOnly spellCheck={false} /></label>
      <p className={hints.length ? "tool-error" : "tool-note"}>{hints.length ? hints.join(" ") : "基础策略不包含明显高风险项；上线前建议先使用 Content-Security-Policy-Report-Only 观察。"}</p>
    </section>
  );
}
