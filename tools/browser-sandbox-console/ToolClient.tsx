"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";
import {
  DEFAULT_IFRAME_SANDBOX,
  createToolSdk,
  useToolRuntime,
  type IframeSandboxClient
} from "@tool-platform/tool-browser-sdk";

interface SandboxLog {
  level: "log" | "info" | "warn" | "error";
  message: string;
  at: string;
}

interface SandboxRunResult {
  logs: SandboxLog[];
  bodyText: string;
  htmlLength: number;
}

const initialHtml = `<main class="demo">
  <h1>沙箱预览</h1>
  <p>这段内容会在隔离 iframe 中渲染。</p>
  <button id="run">运行动作</button>
</main>`;

const initialCss = `.demo {
  display: grid;
  gap: 12px;
  padding: 22px;
  font-family: ui-sans-serif, system-ui;
  color: #edf7ff;
}

button {
  width: max-content;
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  background: #5eead4;
  color: #06221f;
}`;

const initialJs = `document.getElementById("run")?.addEventListener("click", () => {
  console.log("button clicked", new Date().toISOString());
});

console.info("sandbox ready");`;

const channel = "tool-platform:sandbox";

function createConsoleSandboxDocument() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Browser Sandbox Console</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #0f151d;
      color: #eef6ff;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #preview { min-height: 100vh; }
    #runtime-error {
      display: none;
      margin: 14px;
      padding: 12px;
      border: 1px solid rgba(244, 63, 94, .4);
      border-radius: 8px;
      background: rgba(244, 63, 94, .12);
      color: #fecdd3;
      white-space: pre-wrap;
    }
  </style>
  <style id="user-css"></style>
</head>
<body>
  <div id="runtime-error"></div>
  <div id="preview"></div>
  <script>
    const channel = ${JSON.stringify(channel)};
    const preview = document.getElementById("preview");
    const userCss = document.getElementById("user-css");
    const runtimeError = document.getElementById("runtime-error");
    let logs = [];
    const originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };

    function format(value) {
      if (typeof value === "string") return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    function capture(level, args) {
      logs.push({
        level,
        message: Array.from(args).map(format).join(" "),
        at: new Date().toISOString()
      });
      originalConsole[level](...args);
    }

    ["log", "info", "warn", "error"].forEach((level) => {
      console[level] = (...args) => capture(level, args);
    });

    window.addEventListener("error", (event) => {
      capture("error", [event.message]);
    });

    function respond(id, success, data, error) {
      parent.postMessage({ channel, id, type: "response", success, data, error }, "*");
    }

    window.addEventListener("message", (event) => {
      const message = event.data;

      if (!message || message.channel !== channel || message.type !== "call") {
        return;
      }

      try {
        if (message.action !== "runSnippet") {
          throw new Error("Unknown sandbox action: " + message.action);
        }

        logs = [];
        runtimeError.style.display = "none";
        runtimeError.textContent = "";

        const payload = message.payload || {};
        preview.innerHTML = payload.html || "";
        userCss.textContent = payload.css || "";

        const result = new Function(payload.js || "")();

        if (typeof result !== "undefined") {
          capture("info", ["return", result]);
        }

        respond(message.id, true, {
          logs,
          bodyText: preview.innerText.slice(0, 800),
          htmlLength: preview.innerHTML.length
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Sandbox execution failed";
        runtimeError.style.display = "block";
        runtimeError.textContent = messageText;
        capture("error", [messageText]);
        respond(message.id, false, { logs }, messageText);
      }
    });

    parent.postMessage({ channel, id: "ready", type: "ready" }, "*");
  </script>
</body>
</html>`;
}

function createPortableSrcDoc(html: string, css: string, js: string) {
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
${js}
</script>
</body>
</html>`;
}

export default function BrowserSandboxConsoleTool({ manifest }: ToolClientProps) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sandboxClientRef = useRef<IframeSandboxClient | null>(null);

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const sdk = sdkRef.current;
  const runtime = useToolRuntime(manifest.id);
  const sandboxDocument = useMemo(() => createConsoleSandboxDocument(), []);
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [logs, setLogs] = useState<SandboxLog[]>([]);
  const [result, setResult] = useState<SandboxRunResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    sdk.registerRuntime(manifest.id, () => ({
      init() {
        setError("");
      },
      destroy() {
        sandboxClientRef.current?.dispose();
        sandboxClientRef.current = null;
      }
    }));

    void sdk.openTool(manifest.id);

    return () => {
      sandboxClientRef.current?.dispose();
      sandboxClientRef.current = null;
      void sdk.closeTool(manifest.id);
      void sdk.unregisterRuntime(manifest.id);
    };
  }, [manifest.id, sdk]);

  function handleSandboxLoad() {
    sandboxClientRef.current?.dispose();

    if (!iframeRef.current) {
      return;
    }

    sandboxClientRef.current = sdk.createIframeSandboxClient(iframeRef.current);
    void runSnippet();
  }

  async function runSnippet() {
    setError("");
    setCopied(false);

    try {
      await sdk.openTool(manifest.id);

      if (!sandboxClientRef.current) {
        throw new Error("Sandbox iframe is not ready");
      }

      const nextResult = await sandboxClientRef.current.call<SandboxRunResult>("runSnippet", {
        html,
        css,
        js
      });

      setResult(nextResult);
      setLogs(nextResult.logs);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Sandbox execution failed");
    }
  }

  async function copySrcDoc() {
    try {
      await sdk.copy(createPortableSrcDoc(html, css, js));
      setCopied(true);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">iframe 沙箱</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void runSnippet()}>运行</button>
        <button type="button" onClick={() => {
          setHtml(initialHtml);
          setCss(initialCss);
          setJs(initialJs);
        }}>重置</button>
        <button type="button" onClick={() => void copySrcDoc()}>{copied ? "已复制" : "复制 srcdoc"}</button>
        <div className="mono-output">Runtime: {runtime.status}</div>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>HTML</span>
            <textarea value={html} onChange={(event) => setHtml(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>CSS</span>
            <textarea value={css} onChange={(event) => setCss(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>JavaScript</span>
            <textarea value={js} onChange={(event) => setJs(event.target.value)} spellCheck={false} />
          </label>
        </div>

        <div className="workspace workspace--stack">
          <iframe
            ref={iframeRef}
            className="sandbox-frame"
            sandbox={DEFAULT_IFRAME_SANDBOX}
            srcDoc={sandboxDocument}
            title="browser sandbox console"
            onLoad={handleSandboxLoad}
          />

          <div className="detail-grid">
            <article className="detail-card">
              <h3>日志</h3>
              <p>{logs.length}</p>
            </article>
            <article className="detail-card">
              <h3>HTML</h3>
              <p>{result?.htmlLength ?? 0}</p>
            </article>
            <article className="detail-card">
              <h3>文本</h3>
              <p>{result?.bodyText.length ?? 0}</p>
            </article>
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>级别</span>
              <span>消息</span>
            </div>
            {logs.map((item, index) => (
              <div className="tool-table__row" key={`${item.at}-${index}`}>
                <span>{item.level}</span>
                <span>{item.message}</span>
              </div>
            ))}
            {logs.length === 0 ? (
              <div className="tool-table__row">
                <span>-</span>
                <span>没有 console 输出</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">iframe 使用 allow-scripts sandbox，不授予同源、表单提交或弹窗权限；它适合本地验证片段行为，不适合模拟完整生产浏览器上下文。</p>
    </section>
  );
}
