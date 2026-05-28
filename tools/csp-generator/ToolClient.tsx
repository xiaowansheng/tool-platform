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
  const directiveFields: Array<{
    label: string;
    value: string;
    setValue: (next: string) => void;
  }> = [
    { label: "default-src", value: defaultSrc, setValue: setDefaultSrc },
    { label: "script-src", value: scriptSrc, setValue: setScriptSrc },
    { label: "style-src", value: styleSrc, setValue: setStyleSrc },
    { label: "img-src", value: imgSrc, setValue: setImgSrc },
    { label: "connect-src", value: connectSrc, setValue: setConnectSrc },
    { label: "frame-ancestors", value: frameAncestors, setValue: setFrameAncestors }
  ];
  const policy = [
    `default-src ${defaultSrc}`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `connect-src ${connectSrc}`,
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "object-src 'none'"
  ].join("; ");
  const hints = [
    scriptSrc.includes("'unsafe-inline'") ? "script-src 包含 unsafe-inline，风险较高。" : "",
    frameAncestors !== "'none'" ? "允许被 iframe 嵌入时需要确认点击劫持风险。" : ""
  ].filter(Boolean);

  async function copyPolicy() {
    await navigator.clipboard.writeText(`Content-Security-Policy: ${policy}`);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Security Header</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        {directiveFields.map((field) => (
          <label key={field.label} className="tool-field tool-field--compact">
            <span>{field.label}</span>
            <input value={field.value} onChange={(event) => field.setValue(event.target.value)} />
          </label>
        ))}
      </div>
      <div className="tool-toolbar"><button type="button" onClick={() => void copyPolicy()}>复制 Header</button></div>
      <label className="tool-field"><span>CSP</span><textarea value={`Content-Security-Policy: ${policy}`} readOnly spellCheck={false} /></label>
      <p className="tool-note">{hints.length ? hints.join(" ") : "基础策略不包含明显高风险项。"}</p>
    </section>
  );
}
