"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const initialHtml = `<main>
  <h1>沙箱预览</h1>
  <button id="action">点击我</button>
  <p id="message">HTML、CSS 和 JS 会隔离在 iframe 中。</p>
</main>`;

const initialCss = `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}

main {
  display: grid;
  gap: 12px;
  padding: 28px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
}`;

const initialJs = `const button = document.querySelector("#action");
const message = document.querySelector("#message");

button?.addEventListener("click", () => {
  message.textContent = "Button clicked at " + new Date().toLocaleTimeString();
});`;

function buildDocument(html: string, css: string, js: string) {
  const safeJs = js.replaceAll("</script", "<\\/script");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${css}</style>
</head>
<body>
${html}
<script>
try {
${safeJs}
} catch (error) {
  const pre = document.createElement("pre");
  pre.textContent = String(error && error.stack ? error.stack : error);
  pre.style.cssText = "white-space:pre-wrap;color:#b91c1c;background:#fee2e2;padding:12px;border-radius:8px;";
  document.body.appendChild(pre);
}
</script>
</body>
</html>`;
}

export default function HtmlCssJsPlaygroundTool({ manifest }: ToolClientProps) {
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const documentSource = useMemo(() => buildDocument(html, css, js), [css, html, js]);

  async function copyDocument() {
    try {
      await navigator.clipboard.writeText(documentSource);
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
          <p className="eyebrow">沙箱</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => {
          setHtml(initialHtml);
          setCss(initialCss);
          setJs(initialJs);
          setCopied(false);
        }}>重置示例</button>
        <button type="button" onClick={() => void copyDocument()}>{copied ? "已复制" : "复制 HTML"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>HTML</h3><p>{html.length} chars</p></article>
        <article className="detail-card"><h3>CSS</h3><p>{css.length} chars</p></article>
        <article className="detail-card"><h3>JS</h3><p>{js.length} chars</p></article>
        <article className="detail-card"><h3>隔离</h3><p>iframe 沙箱</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>HTML</span><textarea value={html} onChange={(event) => {
            setHtml(event.target.value);
            setCopied(false);
          }} spellCheck={false} /></label>
          <label className="tool-field"><span>CSS</span><textarea value={css} onChange={(event) => {
            setCss(event.target.value);
            setCopied(false);
          }} spellCheck={false} /></label>
          <label className="tool-field"><span>JavaScript</span><textarea value={js} onChange={(event) => {
            setJs(event.target.value);
            setCopied(false);
          }} spellCheck={false} /></label>
        </div>
        <div className="workspace workspace--stack">
          <iframe
            title="Sandbox preview"
            sandbox="allow-scripts"
            srcDoc={documentSource}
            style={{ width: "100%", minHeight: "34rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "white" }}
          />
          <label className="tool-field">
            <span>单文件导出</span>
            <textarea value={documentSource} readOnly spellCheck={false} />
          </label>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">预览运行在没有 same-origin 权限的 iframe sandbox 中，适合快速验证片段；不要粘贴敏感凭据。</p>
    </section>
  );
}
