"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #4f46e5; color: white; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 32px 24px; color: #333; line-height: 1.6; }
    .cta { display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
    </div>
    <div class="body">
      <h2>Hi {{user_name}},</h2>
      <p>{{message}}</p>
      <a href="{{cta_link}}" class="cta">{{cta_text}}</a>
      <p>如有问题，请回复此邮件联系我们。</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 {{company_name}}. All rights reserved.</p>
      <p>{{address}}</p>
    </div>
  </div>
</body>
</html>`;

const defaultVars: Record<string, string> = {
  company_name: "Tool Platform",
  user_name: "开发者",
  message: "感谢您注册我们的平台！请点击下方按钮完成账户激活。",
  cta_link: "https://example.com/activate",
  cta_text: "立即激活",
  address: "北京市朝阳区科技路 100 号"
};

type ViewMode = "desktop" | "mobile" | "source";

export default function EmailTemplateSandboxTool({ manifest }: ToolAppProps) {
  const [template, setTemplate] = useState(sampleTemplate);
  const [vars, setVars] = useState<Record<string, string>>(defaultVars);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const renderedHtml = useMemo(() => {
    let html = template;
    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return html;
  }, [template, vars]);

  const detectedVars = useMemo(() => {
    const matches = template.matchAll(/\{\{(\w+)\}\}/g);
    return [...new Set([...matches].map((m) => m[1]!))];
  }, [template]);

  useEffect(() => {
    const newVars: Record<string, string> = {};
    for (const key of detectedVars) {
      newVars[key] = vars[key] ?? "";
    }
    setVars(newVars);
  }, [detectedVars.join(",")]);

  useEffect(() => {
    if (viewMode === "source" || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(renderedHtml);
      doc.close();
    }
  }, [renderedHtml, viewMode]);

  async function handleCopy() {
    await navigator.clipboard.writeText(renderedHtml);
    setCopied(true);
  }

  const iframeWidth = viewMode === "mobile" ? 375 : 640;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">邮件开发</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>预览模式</span>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="desktop">桌面端 (640px)</option>
            <option value="mobile">移动端 (375px)</option>
            <option value="source">HTML 源码</option>
          </select>
        </label>
        <button type="button" onClick={() => void handleCopy()} disabled={!renderedHtml}>
          {copied ? "已复制" : "复制渲染结果"}
        </button>
        <button type="button" onClick={() => { setTemplate(sampleTemplate); setVars(defaultVars); setCopied(false); }}>
          重置示例
        </button>
      </div>

      {detectedVars.length > 0 && (
        <div className="detail-grid">
          {detectedVars.map((varName) => (
            <label key={varName} className="tool-field tool-field--compact">
              <span>{`{{${varName}}}`}</span>
              <input
                value={vars[varName] ?? ""}
                onChange={(e) => setVars({ ...vars, [varName]: e.target.value })}
                placeholder={`输入 ${varName} 的值`}
              />
            </label>
          ))}
        </div>
      )}

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>HTML 模板</span>
          <textarea
            value={template}
            onChange={(e) => { setTemplate(e.target.value); setCopied(false); }}
            spellCheck={false}
            rows={20}
            className="mono-output"
          />
        </label>
        <label className="tool-field">
          <span>预览</span>
          {viewMode === "source" ? (
            <textarea value={renderedHtml} readOnly spellCheck={false} rows={20} className="mono-output" />
          ) : (
            <iframe
              ref={iframeRef}
              title="email-preview"
              style={{
                width: "100%",
                maxWidth: iframeWidth,
                height: 500,
                border: "1px solid var(--border, #ddd)",
                borderRadius: 8,
                background: "#fff"
              }}
              sandbox=""
            />
          )}
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>模板变量</h3>
          <p>{detectedVars.length}</p>
        </article>
        <article className="detail-card">
          <h3>模板大小</h3>
          <p>{new Blob([template]).size} B</p>
        </article>
        <article className="detail-card">
          <h3>预览宽度</h3>
          <p>{viewMode === "source" ? "源码" : `${iframeWidth}px`}</p>
        </article>
      </div>

      <p className="tool-note">
        使用 {"{{变量名}}"} 语法定义模板变量，右侧自动渲染预览。
        沙盒 iframe 隔离执行，确保安全预览。
      </p>
    </section>
  );
}
