export const SANDBOX_CHANNEL = "tool-platform:sandbox";
export const DEFAULT_IFRAME_SANDBOX = "allow-scripts";

export interface SandboxCallMessage<TPayload = unknown> {
  channel: typeof SANDBOX_CHANNEL;
  id: string;
  type: "call";
  action: string;
  payload: TPayload;
}

export interface SandboxResponseMessage<TResult = unknown> {
  channel: typeof SANDBOX_CHANNEL;
  id: string;
  type: "response";
  success: boolean;
  data?: TResult;
  error?: string;
}

export interface SandboxReadyMessage {
  channel: typeof SANDBOX_CHANNEL;
  id: "ready";
  type: "ready";
}

export type SandboxMessage = SandboxCallMessage | SandboxResponseMessage | SandboxReadyMessage;

export interface SandboxDocumentOptions {
  title?: string;
  accentColor?: string;
}

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `sandbox-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createSandboxDocument(options: SandboxDocumentOptions = {}) {
  const title = escapeHtml(options.title ?? "Sandbox Preview");
  const accentColor = escapeHtml(options.accentColor ?? "#5eead4");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; --accent: ${accentColor}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #101316;
      color: #eef2f5;
    }
    main { display: grid; gap: 14px; padding: 18px; }
    header { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    h1 { margin: 0; font-size: 18px; font-weight: 650; }
    p { margin: 0; color: #b6c2cc; line-height: 1.55; }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      padding: 14px;
      background: rgba(255,255,255,.045);
      color: #eef2f5;
      min-height: 220px;
    }
    .badge { color: var(--accent); font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1 id="title">${title}</h1>
      <span class="badge">isolated</span>
    </header>
    <p id="prompt"></p>
    <pre id="response"></pre>
  </main>
  <script>
    const channel = ${JSON.stringify(SANDBOX_CHANNEL)};
    const titleNode = document.getElementById("title");
    const promptNode = document.getElementById("prompt");
    const responseNode = document.getElementById("response");

    function respond(id, success, data, error) {
      parent.postMessage({ channel, id, type: "response", success, data, error }, "*");
    }

    window.addEventListener("message", (event) => {
      const message = event.data;

      if (!message || message.channel !== channel || message.type !== "call") {
        return;
      }

      try {
        if (message.action !== "renderPreview") {
          throw new Error("Unknown sandbox action: " + message.action);
        }

        const payload = message.payload || {};
        titleNode.textContent = payload.title || ${JSON.stringify(title)};
        promptNode.textContent = payload.prompt || "";
        responseNode.textContent = payload.response || "";
        respond(message.id, true, { rendered: true });
      } catch (error) {
        respond(message.id, false, undefined, error instanceof Error ? error.message : "Sandbox action failed");
      }
    });

    parent.postMessage({ channel, id: "ready", type: "ready" }, "*");
  </script>
</body>
</html>`;
}

export class IframeSandboxClient {
  private pending = new Map<string, { resolve(value: unknown): void; reject(error: Error): void }>();
  private readonly onMessage = (event: MessageEvent<SandboxMessage>) => {
    if (event.source !== this.iframe.contentWindow) {
      return;
    }

    const message = event.data;

    if (!message || message.channel !== SANDBOX_CHANNEL || message.type !== "response") {
      return;
    }

    const request = this.pending.get(message.id);

    if (!request) {
      return;
    }

    this.pending.delete(message.id);

    if (message.success) {
      request.resolve(message.data);
      return;
    }

    request.reject(new Error(message.error ?? "Sandbox action failed"));
  };

  constructor(private iframe: HTMLIFrameElement, private targetOrigin = "*") {
    window.addEventListener("message", this.onMessage);
  }

  call<TResult = unknown, TPayload = unknown>(action: string, payload: TPayload) {
    const id = createMessageId();

    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject
      });

      this.iframe.contentWindow?.postMessage(
        {
          channel: SANDBOX_CHANNEL,
          id,
          type: "call",
          action,
          payload
        } satisfies SandboxCallMessage<TPayload>,
        this.targetOrigin
      );
    });
  }

  dispose() {
    window.removeEventListener("message", this.onMessage);

    for (const [id, request] of this.pending) {
      this.pending.delete(id);
      request.reject(new Error(`Sandbox client disposed before "${id}" completed`));
    }
  }
}

export function createIframeSandboxClient(iframe: HTMLIFrameElement, targetOrigin = "*") {
  return new IframeSandboxClient(iframe, targetOrigin);
}
