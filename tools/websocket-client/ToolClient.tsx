"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type SocketState = "idle" | "connecting" | "open" | "closed" | "error";
type LogDirection = "system" | "out" | "in";

interface SocketLog {
  id: number;
  time: string;
  direction: LogDirection;
  message: string;
}

function stateLabel(state: SocketState) {
  const labels: Record<SocketState, string> = {
    idle: "Idle",
    connecting: "Connecting",
    open: "Open",
    closed: "Closed",
    error: "Error"
  };

  return labels[state];
}

function stateDotClass(state: SocketState) {
  if (state === "open") return "status-dot";
  if (state === "connecting") return "status-dot status-dot--running";
  if (state === "error") return "status-dot status-dot--error";

  return "status-dot status-dot--idle";
}

function protocolList(value: string) {
  return value.split(",").map((protocol) => protocol.trim()).filter(Boolean);
}

function formatInbound(data: string | ArrayBuffer | Blob) {
  if (typeof data === "string") return data;
  if (data instanceof Blob) return `[Blob ${data.size} bytes]`;

  const bytes = new Uint8Array(data);
  const preview = Array.from(bytes.slice(0, 32)).map((byte) => byte.toString(16).padStart(2, "0")).join(" ");

  return `[ArrayBuffer ${bytes.length} bytes] ${preview}`;
}

export default function WebsocketClientTool({ manifest }: ToolClientProps) {
  const [url, setUrl] = useState("wss://echo.websocket.events");
  const [protocols, setProtocols] = useState("");
  const [message, setMessage] = useState(JSON.stringify({ type: "ping", ts: Date.now() }, null, 2));
  const [state, setState] = useState<SocketState>("idle");
  const [logs, setLogs] = useState<SocketLog[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const logIdRef = useRef(1);

  function append(direction: LogDirection, nextMessage: string) {
    const id = logIdRef.current;
    logIdRef.current += 1;

    setLogs((current) => [{
      id,
      direction,
      message: nextMessage,
      time: new Date().toLocaleTimeString()
    }, ...current].slice(0, 120));
  }

  function disconnect() {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    socketRef.current = null;
    socket.close(1000, "Client closed");
    setState("closed");
  }

  function connect() {
    disconnect();
    setState("connecting");

    try {
      const selectedProtocols = protocolList(protocols);
      const socket = selectedProtocols.length > 0
        ? new WebSocket(url, selectedProtocols)
        : new WebSocket(url);

      socket.binaryType = "arraybuffer";
      socketRef.current = socket;
      append("system", `Connecting to ${url}`);

      socket.addEventListener("open", () => {
        if (socketRef.current !== socket) return;
        setState("open");
        append("system", "Connection opened");
      });

      socket.addEventListener("message", (event) => {
        if (socketRef.current !== socket) return;
        append("in", formatInbound(event.data as string | ArrayBuffer | Blob));
      });

      socket.addEventListener("close", (event) => {
        if (socketRef.current !== socket) return;
        setState(event.wasClean ? "closed" : "error");
        append("system", `Closed ${event.code}${event.reason ? `: ${event.reason}` : ""}`);
        socketRef.current = null;
      });

      socket.addEventListener("error", () => {
        if (socketRef.current !== socket) return;
        setState("error");
        append("system", "Socket error");
      });
    } catch (connectError) {
      setState("error");
      append("system", connectError instanceof Error ? connectError.message : "Connection failed");
    }
  }

  function sendMessage() {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      append("system", "Cannot send: socket is not open");
      return;
    }

    socket.send(message);
    append("out", message);
  }

  useEffect(() => () => {
    socketRef.current?.close(1000, "Tool unmounted");
  }, []);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">实时调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>WebSocket URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="wss://example.com/socket" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>协议</span>
          <input value={protocols} onChange={(event) => setProtocols(event.target.value)} placeholder="graphql-transport-ws, chat" />
        </label>
        <button type="button" onClick={connect} disabled={state === "connecting" || state === "open"}>连接</button>
        <button type="button" onClick={disconnect} disabled={state !== "open" && state !== "connecting"}>断开</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>状态</h3>
          <p><span className={stateDotClass(state)} />{stateLabel(state)}</p>
        </article>
        <article className="detail-card">
          <h3>协议</h3>
          <p>{socketRef.current?.protocol || "n/a"}</p>
        </article>
        <article className="detail-card">
          <h3>日志</h3>
          <p>{logs.length}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>消息</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} spellCheck={false} />
        </label>
        <div className="workspace workspace--stack">
          <button type="button" onClick={sendMessage} disabled={state !== "open"}>发送消息</button>
          <button type="button" onClick={() => setLogs([])} disabled={logs.length === 0}>清空日志</button>
          <p className="tool-note">浏览器会直接连接目标 ws/wss 端点；混合内容、证书错误或服务端 Origin 策略会导致连接失败。</p>
        </div>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "5rem 5rem minmax(0, 1fr)" }}>
          <span>时间</span>
          <span>方向</span>
          <span>内容</span>
        </div>
        {logs.length > 0 ? logs.map((entry) => (
          <div key={entry.id} className="tool-table__row" style={{ gridTemplateColumns: "5rem 5rem minmax(0, 1fr)" }}>
            <span>{entry.time}</span>
            <span>{entry.direction}</span>
            <span className="mono-output">{entry.message}</span>
          </div>
        )) : (
          <div className="tool-table__row" style={{ gridTemplateColumns: "1fr" }}>
            <span>暂无事件</span>
          </div>
        )}
      </div>
    </section>
  );
}
