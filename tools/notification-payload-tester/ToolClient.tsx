"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface NotificationHistoryItem {
  title: string;
  body: string;
  tag: string;
  at: string;
}

type ExtendedNotificationOptions = NotificationOptions & {
  renotify?: boolean;
};

function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

function buildOptions(input: {
  body: string;
  tag: string;
  icon: string;
  badge: string;
  silent: boolean;
  requireInteraction: boolean;
}) {
  const options: ExtendedNotificationOptions = {
    body: input.body,
    silent: input.silent,
    requireInteraction: input.requireInteraction
  };

  if (input.tag.trim()) {
    options.tag = input.tag.trim();
    options.renotify = true;
  }

  if (input.icon.trim()) {
    options.icon = input.icon.trim();
  }

  if (input.badge.trim()) {
    options.badge = input.badge.trim();
  }

  return options;
}

export default function NotificationPayloadTesterTool({ manifest }: ToolClientProps) {
  const timeoutRef = useRef<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [title, setTitle] = useState("Tool Platform");
  const [body, setBody] = useState("通知 payload 已准备好，可以用于浏览器权限与文案验证。");
  const [tag, setTag] = useState("tool-platform-preview");
  const [icon, setIcon] = useState("");
  const [badge, setBadge] = useState("");
  const [silent, setSilent] = useState(false);
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const options = useMemo(() => buildOptions({
    body,
    tag,
    icon,
    badge,
    silent,
    requireInteraction
  }), [badge, body, icon, requireInteraction, silent, tag]);

  const snippet = useMemo(() => {
    const payload = JSON.stringify(options, null, 2);

    return `const permission = await Notification.requestPermission();

if (permission === "granted") {
  new Notification(${JSON.stringify(title)}, ${payload});
}`;
  }, [options, title]);

  useEffect(() => {
    setPermission(getNotificationPermission());

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function requestPermission() {
    setError("");
    setCopied(false);

    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      setError("当前浏览器不支持 Notification API");
      return;
    }

    try {
      const nextPermission = await Notification.requestPermission();

      setPermission(nextPermission);
      setStatus(`permission:${nextPermission}`);
    } catch (permissionError) {
      setError(permissionError instanceof Error ? permissionError.message : "通知授权请求失败");
    }
  }

  function pushHistory() {
    setHistory((items) => [
      {
        title,
        body,
        tag,
        at: new Date().toISOString()
      },
      ...items
    ].slice(0, 8));
  }

  function sendNow() {
    setError("");
    setCopied(false);

    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      setError("当前浏览器不支持 Notification API");
      return;
    }

    if (Notification.permission !== "granted") {
      setPermission(Notification.permission);
      setError("Notification permission 不是 granted，请先完成授权。");
      return;
    }

    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    pushHistory();
    setStatus("sent");
  }

  function scheduleNotification() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    if (delaySeconds <= 0) {
      sendNow();
      return;
    }

    setStatus(`scheduled:${delaySeconds}s`);
    timeoutRef.current = window.setTimeout(() => {
      sendNow();
      timeoutRef.current = null;
    }, delaySeconds * 1000);
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  const payloadJson = JSON.stringify({
    title,
    options
  }, null, 2);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">通知 API</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void requestPermission()}>
          请求授权
        </button>
        <button type="button" onClick={sendNow} disabled={permission !== "granted"}>立即发送</button>
        <button type="button" onClick={scheduleNotification} disabled={permission !== "granted"}>按延迟发送</button>
        <button type="button" onClick={() => void copySnippet()}>{copied ? "已复制" : "复制代码"}</button>
        <div className="mono-output">Status: {status}</div>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>权限</h3>
          <p>{permission}</p>
        </article>
        <article className="detail-card">
          <h3>历史</h3>
          <p>{history.length}</p>
        </article>
        <article className="detail-card">
          <h3>静默</h3>
          <p>{silent ? "yes" : "no"}</p>
        </article>
        <article className="detail-card">
          <h3>交互要求</h3>
          <p>{requireInteraction ? "yes" : "no"}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="tool-field">
            <span>正文</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>Tag</span>
              <input value={tag} onChange={(event) => setTag(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>延迟秒数</span>
              <input type="number" min="0" max="120" value={delaySeconds} onChange={(event) => setDelaySeconds(Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>图标 URL</span>
              <input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="https://..." />
            </label>
            <label className="tool-field tool-field--compact">
              <span>徽章 URL</span>
              <input value={badge} onChange={(event) => setBadge(event.target.value)} placeholder="https://..." />
            </label>
          </div>
          <div className="tool-option-list">
            <label className="tool-check">
              <input type="checkbox" checked={silent} onChange={(event) => setSilent(event.target.checked)} />
              Silent
            </label>
            <label className="tool-check">
              <input type="checkbox" checked={requireInteraction} onChange={(event) => setRequireInteraction(event.target.checked)} />
              Require interaction
            </label>
          </div>
        </div>

        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>载荷 JSON</span>
            <textarea value={payloadJson} readOnly spellCheck={false} />
          </label>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>发送时间</span>
              <span>通知</span>
            </div>
            {history.map((item) => (
              <div className="tool-table__row" key={`${item.at}-${item.title}`}>
                <span>{new Date(item.at).toLocaleTimeString()}</span>
                <span>{item.title} / {item.tag || "-"}</span>
              </div>
            ))}
            {history.length === 0 ? (
              <div className="tool-table__row">
                <span>-</span>
                <span>还没有发送记录</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">Notification API 需要安全上下文，并且授权结果由浏览器和系统通知设置共同决定；已拒绝的站点通常需要在浏览器设置中手动恢复。</p>
    </section>
  );
}
