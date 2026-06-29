"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type SocketState = "idle" | "connecting" | "open" | "closed" | "error" | "reconnecting";
type LogDirection = "system" | "out" | "in";

interface SocketLog {
  id: number;
  time: string;
  direction: LogDirection;
  message: string;
  isHeartbeat?: boolean;
  size?: number;
  dataType?: "text" | "json" | "binary";
}

interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface Preset {
  id: string;
  name: string;
  content: string;
  mode: "text" | "json" | "hex" | "base64";
  isCustom?: boolean;
}

function stateLabel(state: SocketState) {
  const labels: Record<SocketState, string> = {
    idle: "未连接",
    connecting: "连接中",
    open: "已连接",
    closed: "已关闭",
    error: "错误",
    reconnecting: "重连中"
  };

  return labels[state];
}

function stateDotClass(state: SocketState) {
  if (state === "open") return "status-dot";
  if (state === "connecting") return "status-dot status-dot--connecting";
  if (state === "reconnecting") return "status-dot status-dot--reconnecting";
  if (state === "error") return "status-dot status-dot--error";

  return "status-dot status-dot--idle";
}

function protocolList(value: string) {
  return value.split(",").map((protocol) => protocol.trim()).filter(Boolean);
}

function getByteSize(str: string): number {
  try {
    return new TextEncoder().encode(str).length;
  } catch {
    return str.length;
  }
}

// Convert Hex string to ArrayBuffer
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const cleanHex = hex.replace(/\s+|0x/g, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }
  const view = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < view.length; i++) {
    view[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return view.buffer;
}

// Convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.trim());
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Recursive JSON Tree Component
function JsonTreeView({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null) {
    return <span className="ws-json-value ws-json-value--null">null</span>;
  }
  if (typeof data === "undefined") {
    return <span className="ws-json-value ws-json-value--undefined">undefined</span>;
  }
  if (typeof data === "boolean") {
    return (
      <span className={`ws-json-value ws-json-value--boolean ${data ? "ws-json-value--true" : "ws-json-value--false"}`}>
        {data ? "true" : "false"}
      </span>
    );
  }
  if (typeof data === "number") {
    return <span className="ws-json-value ws-json-value--number">{data}</span>;
  }
  if (typeof data === "string") {
    return <span className="ws-json-value ws-json-value--string">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="ws-json-bracket">[]</span>;
    }
    return (
      <details open={depth < 1} className="ws-json-details">
        <summary className="ws-json-summary">
          <span className="ws-json-bracket">[</span>
          <span className="ws-json-info">Array({data.length})</span>
          <span className="ws-json-bracket">]</span>
        </summary>
        <div className="ws-json-children">
          {data.map((item, index) => (
            <div key={index} className="ws-json-row">
              <span className="ws-json-index">{index}:</span>{" "}
              <JsonTreeView data={item} depth={depth + 1} />
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="ws-json-bracket">{"{}"}</span>;
    }
    return (
      <details open={depth < 1} className="ws-json-details">
        <summary className="ws-json-summary">
          <span className="ws-json-bracket">{"{"}</span>
          <span className="ws-json-info">Object({keys.length})</span>
          <span className="ws-json-bracket">{"}"}</span>
        </summary>
        <div className="ws-json-children">
          {keys.map((key) => (
            <div key={key} className="ws-json-row">
              <span className="ws-json-key">"{key}"</span>
              <span className="ws-json-colon">:</span>{" "}
              <JsonTreeView data={(data as Record<string, unknown>)[key]} depth={depth + 1} />
            </div>
          ))}
        </div>
      </details>
    );
  }

  return <span>{String(data)}</span>;
}

// Collapsible Individual Log Item
function LogItem({
  entry,
  onApplyToComposer
}: {
  entry: SocketLog;
  onApplyToComposer: (msg: string, mode: "text" | "json" | "hex" | "base64") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<"text" | "tree">("text");
  const [copied, setCopied] = useState(false);

  const directionLabel = {
    system: "系统",
    out: "发送",
    in: "接收"
  };

  const badgeClass = {
    system: "ws-badge ws-badge--system",
    out: entry.isHeartbeat ? "ws-badge ws-badge--heartbeat" : "ws-badge ws-badge--out",
    in: entry.isHeartbeat ? "ws-badge ws-badge--heartbeat" : "ws-badge ws-badge--in"
  }[entry.direction];

  const parsedJson = useMemo(() => {
    if (entry.dataType !== "json") return null;
    try {
      return JSON.parse(entry.message);
    } catch {
      return null;
    }
  }, [entry.message, entry.dataType]);

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(entry.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const loadIntoEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mode = entry.dataType === "json" ? "json" : "text";
    onApplyToComposer(entry.message, mode);
  };

  // Preview of the message (truncated)
  const messagePreview = useMemo(() => {
    if (entry.direction === "system") return entry.message;
    const cleanMsg = entry.message.replace(/\s+/g, " ");
    return cleanMsg.length > 80 ? cleanMsg.substring(0, 80) + "..." : cleanMsg;
  }, [entry.message, entry.direction]);

  return (
    <div className="ws-log-row-container">
      <div 
        className={`ws-log-row-summary ${expanded ? "expanded" : ""}`} 
        onClick={() => setExpanded(!expanded)}
      >
        <span className="mono-output" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{entry.time}</span>
        <div>
          <span className={badgeClass}>
            {entry.direction === "in" ? "↓ " : entry.direction === "out" ? "↑ " : ""}
            {entry.isHeartbeat ? "心跳" : directionLabel[entry.direction]}
          </span>
        </div>
        <span className="mono-output" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {messagePreview}
        </span>
      </div>

      {expanded && (
        <div className="ws-log-details">
          <div className="ws-log-meta">
            <span>时间: {entry.time}</span>
            <span>大小: {entry.size !== undefined ? `${entry.size} 字节` : "未知"}</span>
            <span>格式: {entry.dataType === "json" ? "JSON" : entry.dataType === "binary" ? "二进制" : "文本/系统"}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <button type="button" className="button-link" style={{ fontSize: "0.75rem" }} onClick={copyToClipboard}>
                {copied ? "已复制" : "复制"}
              </button>
              {entry.direction !== "system" && (
                <button type="button" className="button-link" style={{ fontSize: "0.75rem" }} onClick={loadIntoEditor}>
                  填入编辑器
                </button>
              )}
            </div>
          </div>

          {entry.direction !== "system" && parsedJson && (
            <div className="segmented-control" style={{ margin: "0 0 0.5rem 0", padding: 2, height: "auto" }}>
              <button 
                type="button" 
                className={detailTab === "text" ? "active" : ""} 
                style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                onClick={() => setDetailTab("text")}
              >
                格式化文本
              </button>
              <button 
                type="button" 
                className={detailTab === "tree" ? "active" : ""} 
                style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                onClick={() => setDetailTab("tree")}
              >
                JSON 树形
              </button>
            </div>
          )}

          {entry.direction === "system" ? (
            <div className="ws-log-content-box" style={{ color: "var(--text-secondary)" }}>
              {entry.message}
            </div>
          ) : detailTab === "tree" && parsedJson ? (
            <div className="ws-log-content-box" style={{ paddingLeft: "1.5rem" }}>
              <JsonTreeView data={parsedJson} />
            </div>
          ) : (
            <pre className="ws-log-content-box">
              {entry.dataType === "json" && parsedJson 
                ? JSON.stringify(parsedJson, null, 2) 
                : entry.message}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function WebsocketClientTool({ manifest }: ToolAppProps) {
  // Connection states
  const [url, setUrl] = useState("wss://echo.websocket.events");
  const [protocols, setProtocols] = useState("");
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);
  const [state, setState] = useState<SocketState>("idle");
  const [logs, setLogs] = useState<SocketLog[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-reconnect configs
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState(5);
  const [reconnectDelay, setReconnectDelay] = useState(3);

  // Heartbeat configs
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState(15);
  const [heartbeatMessage, setHeartbeatMessage] = useState("ping");

  // Message composing states
  const [message, setMessage] = useState(JSON.stringify({ type: "ping", ts: Date.now() }, null, 2));
  const [messageMode, setMessageMode] = useState<"text" | "json" | "hex" | "base64">("json");
  const [composerTab, setComposerTab] = useState<"compose" | "presets">("compose");

  // Preset state
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showSavePresetInline, setShowSavePresetInline] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Stats / Counters
  const [duration, setDuration] = useState(0);
  const [sentStats, setSentStats] = useState({ count: 0, bytes: 0 });
  const [recvStats, setRecvStats] = useState({ count: 0, bytes: 0 });

  // Log filtering states
  const [logFilter, setLogFilter] = useState<"all" | "in" | "out" | "system">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Websocket refs
  const socketRef = useRef<WebSocket | null>(null);
  const logIdRef = useRef(1);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manualCloseRef = useRef(false);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute final connection URL incorporating query parameters
  const finalUrl = useMemo(() => {
    if (!url) return "";
    try {
      const parsedUrl = new URL(url);
      queryParams.forEach(p => {
        if (p.enabled && p.key) {
          parsedUrl.searchParams.set(p.key, p.value);
        }
      });
      return parsedUrl.toString();
    } catch {
      // In case URL parsing fails during live edits
      const enabledParams = queryParams.filter(p => p.enabled && p.key);
      if (enabledParams.length === 0) return url;
      const search = enabledParams
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join("&");
      return url + (url.includes("?") ? "&" : "?") + search;
    }
  }, [url, queryParams]);

  // Load Presets on Mount
  useEffect(() => {
    const defaultPresets: Preset[] = [
      { id: "dp1", name: "JSON Ping 消息", content: JSON.stringify({ type: "ping", ts: Date.now() }, null, 2), mode: "json" },
      { id: "dp2", name: "文本 Ping", content: "ping", mode: "text" },
      { id: "dp3", name: "读取状态数据", content: JSON.stringify({ action: "status" }, null, 2), mode: "json" },
      { id: "dp4", name: "Hex 心跳测试", content: "00 ff ab cd", mode: "hex" }
    ];

    try {
      const saved = localStorage.getItem("ws_client_presets");
      if (saved) {
        const parsed = JSON.parse(saved) as Preset[];
        // Merge defaults with custom saved presets
        const customs = parsed.filter(p => p.isCustom);
        setPresets([...defaultPresets, ...customs]);
      } else {
        setPresets(defaultPresets);
      }
    } catch {
      setPresets(defaultPresets);
    }
  }, []);

  // Save presets to localStorage
  const savePresetsToStorage = (updatedPresets: Preset[]) => {
    localStorage.setItem("ws_client_presets", JSON.stringify(updatedPresets));
  };

  // Helper to append events to the log view
  const append = useCallback((direction: LogDirection, nextMessage: string, isHeartbeat = false) => {
    const id = logIdRef.current;
    logIdRef.current += 1;

    let dataType: "text" | "json" | "binary" = "text";
    let size = getByteSize(nextMessage);

    if (direction !== "system") {
      try {
        JSON.parse(nextMessage);
        dataType = "json";
      } catch {
        if (messageMode === "hex" || messageMode === "base64" || nextMessage.startsWith("[ArrayBuffer") || nextMessage.startsWith("[Blob")) {
          dataType = "binary";
        } else {
          dataType = "text";
        }
      }
    }

    setLogs((current) => [
      {
        id,
        direction,
        message: nextMessage,
        time: new Date().toLocaleTimeString(),
        isHeartbeat,
        size,
        dataType
      },
      ...current
    ].slice(0, 300)); // Cap logs to 300 entries for performance
  }, [messageMode]);

  // Duration Timer controller
  useEffect(() => {
    if (state === "open") {
      setDuration(0);
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [state]);

  // Heartbeat keepalive handler
  useEffect(() => {
    if (state !== "open" || !heartbeatEnabled || !socketRef.current) return;

    const interval = setInterval(() => {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(heartbeatMessage);
          append("out", heartbeatMessage, true);
          setSentStats(prev => ({
            count: prev.count + 1,
            bytes: prev.bytes + getByteSize(heartbeatMessage)
          }));
        } catch (e) {
          append("system", `发送心跳包失败: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }, heartbeatInterval * 1000);

    return () => clearInterval(interval);
  }, [state, heartbeatEnabled, heartbeatInterval, heartbeatMessage, append]);

  // Manual Disconnect handler
  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = socketRef.current;
    if (socket) {
      socketRef.current = null;
      socket.close(1000, "Client closed");
      setState("closed");
      append("system", "手动断开连接");
    }
  }, [append]);

  // Connection initializer
  const connect = useCallback((isReconnecting = false) => {
    if (!isReconnecting) {
      // Manual trigger reset
      manualCloseRef.current = false;
      reconnectAttemptsRef.current = 0;
      setSentStats({ count: 0, bytes: 0 });
      setRecvStats({ count: 0, bytes: 0 });
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    if (!finalUrl.startsWith("ws://") && !finalUrl.startsWith("wss://")) {
      setState("error");
      append("system", "错误：连接 URL 必须以 ws:// 或 wss:// 开头");
      return;
    }

    setState(isReconnecting ? "reconnecting" : "connecting");
    append("system", `${isReconnecting ? "自动重新连接" : "连接"}至: ${finalUrl}`);

    try {
      const selectedProtocols = protocolList(protocols);
      const socket = selectedProtocols.length > 0
        ? new WebSocket(finalUrl, selectedProtocols)
        : new WebSocket(finalUrl);

      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (socketRef.current !== socket) return;
        setState("open");
        reconnectAttemptsRef.current = 0;
        append("system", `连接成功！已选协议: ${socket.protocol || "无"}`);
      });

      socket.addEventListener("message", (event) => {
        if (socketRef.current !== socket) return;

        let incomingMessage = "";
        let size = 0;

        if (typeof event.data === "string") {
          incomingMessage = event.data;
          size = getByteSize(incomingMessage);
        } else if (event.data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(event.data);
          size = bytes.length;
          
          // Try to decode binary as UTF-8
          try {
            const decoder = new TextDecoder("utf-8", { fatal: true });
            incomingMessage = decoder.decode(bytes);
          } catch {
            const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" ");
            incomingMessage = `[ArrayBuffer ${bytes.length} bytes] Hex: ${hex}`;
          }
        } else if (event.data instanceof Blob) {
          size = event.data.size;
          incomingMessage = `[Blob ${event.data.size} bytes]`;
        }

        // Identify common application pings
        const isPing = incomingMessage.toLowerCase() === "pong" || incomingMessage.toLowerCase() === "ping";
        append("in", incomingMessage, isPing);
        setRecvStats(prev => ({ count: prev.count + 1, bytes: prev.bytes + size }));
      });

      socket.addEventListener("close", (event) => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;

        const isAbnormal = !event.wasClean || event.code !== 1000;
        const reconnectEnabled = autoReconnect && !manualCloseRef.current;
        const hasAttemptsLeft = reconnectAttemptsRef.current < maxReconnectAttempts;

        if (reconnectEnabled && hasAttemptsLeft) {
          setState("reconnecting");
          const nextAttempt = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = nextAttempt;
          
          append("system", `连接被断开 (${event.code}${event.reason ? `: ${event.reason}` : ""})。将于 ${reconnectDelay} 秒后尝试第 ${nextAttempt}/${maxReconnectAttempts} 次重连...`);
          
          reconnectTimerRef.current = setTimeout(() => {
            connect(true);
          }, reconnectDelay * 1000);
        } else {
          setState(isAbnormal ? "error" : "closed");
          append("system", `连接已断开. 代码: ${event.code}${event.reason ? `, 原因: ${event.reason}` : ""}`);
          reconnectAttemptsRef.current = 0;
        }
      });

      socket.addEventListener("error", () => {
        if (socketRef.current !== socket) return;
        setState("error");
        append("system", "发生 WebSocket 握手或网络错误。建议检查 CORS, HTTPS / WSS 协议混合内容限制, 以及服务器证书或源站策略。");
      });
    } catch (connectError) {
      setState("error");
      append("system", connectError instanceof Error ? connectError.message : "创建连接失败");
    }
  }, [finalUrl, protocols, autoReconnect, maxReconnectAttempts, reconnectDelay, append]);

  // Send message composer handler
  const sendMessage = () => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      append("system", "无法发送：WebSocket 连接未就绪");
      return;
    }

    try {
      let payload: string | ArrayBuffer = message;
      let byteLen = 0;

      if (messageMode === "hex") {
        payload = hexToArrayBuffer(message);
        byteLen = payload.byteLength;
      } else if (messageMode === "base64") {
        payload = base64ToArrayBuffer(message);
        byteLen = payload.byteLength;
      } else {
        payload = message;
        byteLen = getByteSize(message);
      }

      socket.send(payload);
      append("out", message);
      setSentStats(prev => ({
        count: prev.count + 1,
        bytes: prev.bytes + byteLen
      }));
    } catch (err) {
      append("system", `发送失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Preset controls
  const applyPreset = (preset: Preset) => {
    setMessage(preset.content);
    setMessageMode(preset.mode);
    setComposerTab("compose");
  };

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    
    const newPreset: Preset = {
      id: "cp_" + Math.random().toString(36).substring(2, 9),
      name: newPresetName.trim(),
      content: message,
      mode: messageMode,
      isCustom: true
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    savePresetsToStorage(updated);
    
    setNewPresetName("");
    setShowSavePresetInline(false);
    append("system", `成功保存预设: "${newPreset.name}"`);
  };

  const deletePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    savePresetsToStorage(updated);
  };

  // Query Param editor methods
  const addQueryParam = () => {
    setQueryParams([...queryParams, { id: Math.random().toString(36).slice(2, 9), key: "", value: "", enabled: true }]);
  };

  const updateQueryParam = (id: string, field: "key" | "value" | "enabled", val: unknown) => {
    setQueryParams(queryParams.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const removeQueryParam = (id: string) => {
    setQueryParams(queryParams.filter(p => p.id !== id));
  };

  // Format Composer JSON Content
  const formatJsonMessage = () => {
    try {
      const parsed = JSON.parse(message);
      setMessage(JSON.stringify(parsed, null, 2));
    } catch (e) {
      append("system", `JSON 格式化失败: ${e instanceof Error ? e.message : "无效的 JSON 字符串"}`);
    }
  };

  // Composer validator
  const inputValidation = useMemo(() => {
    if (!message) return { valid: true, error: "" };
    if (messageMode === "json") {
      try {
        JSON.parse(message);
        return { valid: true, error: "" };
      } catch (e) {
        return { valid: false, error: `无效 JSON: ${e instanceof Error ? e.message : "解析失败"}` };
      }
    }
    if (messageMode === "hex") {
      const cleanHex = message.replace(/\s+|0x/g, "");
      if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
        return { valid: false, error: "包含非法字符 (只能是十六进制 0-9, a-f, A-F)" };
      }
      if (cleanHex.length % 2 !== 0) {
        return { valid: false, error: "字符总数须为偶数" };
      }
    }
    if (messageMode === "base64") {
      try {
        atob(message.trim());
      } catch {
        return { valid: false, error: "无效的 Base64 字符串格式" };
      }
    }
    return { valid: true, error: "" };
  }, [message, messageMode]);

  // Log calculations
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilter !== "all" && log.direction !== logFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return log.message.toLowerCase().includes(query) || log.time.toLowerCase().includes(query);
      }
      return true;
    });
  }, [logs, logFilter, searchQuery]);

  const exportLogs = () => {
    try {
      const logsJson = JSON.stringify(logs, null, 2);
      const blob = new Blob([logsJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ws-logs-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      append("system", `导出失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Format Elapsed Time
  const formattedDuration = useMemo(() => {
    const hrs = Math.floor(duration / 3600);
    const mins = Math.floor((duration % 3600) / 60);
    const secs = duration % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, "0") : null,
      String(mins).padStart(2, "0"),
      String(secs).padStart(2, "0")
    ].filter(Boolean).join(":");
  }, [duration]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, "Unmounted");
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="tool-panel">
      {/* Dynamic Custom styles injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ws-client-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        .ws-settings-panel {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ws-advanced-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          padding: 0.25rem 0;
          margin-top: 0.25rem;
          transition: color var(--duration-fast);
        }

        .ws-advanced-toggle-btn:hover {
          color: var(--accent-primary-hover, var(--accent-primary));
          text-decoration: underline;
        }

        .ws-advanced-settings {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          border-top: 1px solid var(--border-default);
          padding-top: 1.25rem;
          margin-top: 0.25rem;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (min-width: 768px) {
          .ws-advanced-settings {
            grid-template-columns: 1.2fr 1fr;
          }
        }

        .ws-param-row {
          display: grid;
          grid-template-columns: auto 1fr 1fr auto;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .ws-param-row input[type="text"] {
          padding: 0.375rem 0.5rem;
          font-size: 0.85rem;
          height: 32px;
        }

        .ws-btn-remove {
          background: transparent;
          border: 1px solid var(--border-default);
          color: #ef4444;
          cursor: pointer;
          padding: 0.375rem;
          height: 32px;
          width: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--duration-fast);
        }

        .ws-btn-remove:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .ws-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .ws-grid-2 {
            grid-template-columns: 4.5fr 5.5fr;
          }
        }

        .ws-composer-card, .ws-logs-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ws-presets-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 320px;
          overflow-y: auto;
        }

        .ws-preset-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.75rem;
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          transition: all var(--duration-fast);
        }

        .ws-preset-item:hover {
          border-color: var(--accent-primary);
          background: rgba(255, 255, 255, 0.02);
        }

        .ws-preset-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          flex: 1;
        }

        .ws-preset-name {
          font-weight: 500;
          color: var(--text-primary);
        }

        .ws-preset-type-badge {
          font-size: 0.7rem;
          padding: 0.1rem 0.35rem;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .ws-preset-delete-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
        }

        .ws-preset-delete-btn:hover {
          color: #ef4444;
        }

        .ws-log-row-container {
          border-bottom: 1px solid var(--border-default);
        }

        .ws-log-row-container:last-child {
          border-bottom: none;
        }

        .ws-log-row-summary {
          display: grid;
          grid-template-columns: 85px 65px 1fr;
          align-items: center;
          padding: 0.65rem 0.5rem;
          cursor: pointer;
          gap: 0.75rem;
          transition: background var(--duration-fast);
        }

        .ws-log-row-summary:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .ws-log-row-summary.expanded {
          background: var(--bg-muted);
        }

        .ws-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }

        .ws-badge--in {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
        }

        .ws-badge--out {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
        }

        .ws-badge--system {
          background: rgba(107, 114, 128, 0.15);
          color: var(--text-secondary);
        }

        .ws-badge--heartbeat {
          background: rgba(168, 85, 247, 0.12);
          color: #c084fc;
        }

        .ws-log-details {
          background: var(--bg-muted);
          border-top: 1px solid var(--border-default);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          animation: slideDown 0.15s ease-out;
        }

        .ws-log-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .ws-log-content-box {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          max-height: 280px;
          overflow: auto;
          font-family: var(--font-mono), monospace;
          font-size: 0.825rem;
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
          line-height: 1.5;
        }

        .ws-json-details {
          margin-left: 0.5rem;
        }
        .ws-json-summary {
          cursor: pointer;
          outline: none;
          user-select: none;
          padding: 0.15rem 0.25rem;
          border-radius: 2px;
        }
        .ws-json-summary:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .ws-json-children {
          border-left: 1px dashed var(--border-default);
          margin-left: 0.5rem;
          padding-left: 0.75rem;
        }
        .ws-json-row {
          margin: 0.2rem 0;
          display: block;
        }
        .ws-json-key {
          color: #c084fc;
        }
        .ws-json-colon {
          color: var(--text-secondary);
          margin-right: 0.25rem;
        }
        .ws-json-index {
          color: #6b7280;
          margin-right: 0.25rem;
        }
        .ws-json-bracket {
          color: var(--text-primary);
        }
        .ws-json-info {
          color: #9ca3af;
          font-size: 0.75rem;
          margin: 0 0.25rem;
          font-style: italic;
        }
        .ws-json-value--string {
          color: #22c55e;
        }
        .ws-json-value--number {
          color: #f97316;
        }
        .ws-json-value--boolean {
          color: #3b82f6;
          font-weight: 500;
        }
        .ws-json-value--null {
          color: #6b7280;
        }
        .ws-json-value--undefined {
          color: #6b7280;
          font-style: italic;
        }

        .ws-preset-save-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          padding: 0.75rem;
          border-radius: var(--radius-md);
          margin-top: 0.5rem;
        }

        .ws-preset-save-input-group {
          display: flex;
          gap: 0.5rem;
        }

        @keyframes pulse-dot {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }

        .status-dot--reconnecting {
          background-color: #eab308 !important;
          animation: pulse-dot 1.5s infinite ease-in-out;
        }

        .status-dot--connecting {
          background-color: #3b82f6 !important;
          animation: pulse-dot 1.5s infinite ease-in-out;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">实时通信调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="ws-client-container">
        {/* Connection Configuration Panel */}
        <div className="ws-settings-panel">
          <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", marginBottom: 0 }}>
            <label className="tool-field tool-field--compact" style={{ gridColumn: "span 2" }}>
              <span>WebSocket 地址 (URL)</span>
              <input 
                type="text"
                value={url} 
                onChange={(event) => setUrl(event.target.value)} 
                placeholder="ws:// 或 wss://" 
                disabled={state === "open" || state === "connecting" || state === "reconnecting"}
              />
            </label>
            <label className="tool-field tool-field--compact">
              <span>子协议 (Protocols)</span>
              <input 
                type="text"
                value={protocols} 
                onChange={(event) => setProtocols(event.target.value)} 
                placeholder="graphql-transport-ws, chat (逗号分隔)" 
                disabled={state === "open" || state === "connecting" || state === "reconnecting"}
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignSelf: "end" }}>
              <button 
                type="button" 
                className="button--primary"
                onClick={() => connect()} 
                style={{ flex: 1 }}
                disabled={state === "connecting" || state === "open" || state === "reconnecting"}
              >
                连接
              </button>
              <button 
                type="button" 
                onClick={disconnect} 
                style={{ flex: 1 }}
                disabled={state !== "open" && state !== "connecting" && state !== "reconnecting"}
              >
                断开
              </button>
            </div>
          </div>

          {/* URL preview when query params exist */}
          {queryParams.some(p => p.enabled && p.key) && (
            <p className="tool-note" style={{ margin: "0", fontSize: "0.78rem", wordBreak: "break-all" }}>
              <strong>最终连接 URL:</strong> <code style={{ color: "var(--accent-primary)" }}>{finalUrl}</code>
            </p>
          )}

          {/* Collapsible Advanced Settings */}
          <div>
            <button 
              type="button" 
              className="ws-advanced-toggle-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "收起高级配置 ▲" : "展开高级配置 (URL 参数/自动重连/心跳包机制) ▼"}
            </button>

            {showAdvanced && (
              <div className="ws-advanced-settings">
                {/* Query Params Editor */}
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", fontWeight: "600" }}>Query 参数编辑器</h4>
                  <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                    {queryParams.length === 0 ? (
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.5rem 0" }}>暂无 URL 参数</p>
                    ) : (
                      queryParams.map((param) => (
                        <div key={param.id} className="ws-param-row">
                          <input 
                            type="checkbox" 
                            checked={param.enabled} 
                            onChange={(e) => updateQueryParam(param.id, "enabled", e.target.checked)}
                          />
                          <input 
                            type="text" 
                            placeholder="键 (key)" 
                            value={param.key} 
                            onChange={(e) => updateQueryParam(param.id, "key", e.target.value)}
                          />
                          <input 
                            type="text" 
                            placeholder="值 (value)" 
                            value={param.value} 
                            onChange={(e) => updateQueryParam(param.id, "value", e.target.value)}
                          />
                          <button 
                            type="button" 
                            className="ws-btn-remove" 
                            onClick={() => removeQueryParam(param.id)}
                            title="删除"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    type="button" 
                    className="button-link" 
                    style={{ fontSize: "0.8rem", padding: "0.25rem 0", marginTop: "0.25rem" }}
                    onClick={addQueryParam}
                  >
                    + 添加参数
                  </button>
                </div>

                {/* Reconnection and Heartbeat Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Auto-reconnect */}
                  <div style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: "1rem" }}>
                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", fontWeight: "600" }}>网络故障自动重连</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={autoReconnect} 
                          onChange={(e) => setAutoReconnect(e.target.checked)} 
                        />
                        开启自动重连
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>重试次数:</span>
                        <input 
                          type="number" 
                          style={{ width: "50px", height: "26px", fontSize: "0.8rem", padding: "0.2rem" }}
                          value={maxReconnectAttempts} 
                          onChange={(e) => setMaxReconnectAttempts(Math.max(1, Number(e.target.value)))} 
                          disabled={!autoReconnect}
                        />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>间隔(秒):</span>
                        <input 
                          type="number" 
                          style={{ width: "50px", height: "26px", fontSize: "0.8rem", padding: "0.2rem" }}
                          value={reconnectDelay} 
                          onChange={(e) => setReconnectDelay(Math.max(1, Number(e.target.value)))} 
                          disabled={!autoReconnect}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Heartbeat keepalive */}
                  <div>
                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", fontWeight: "600" }}>应用层心跳机制 (Heartbeat)</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
                          <input 
                            type="checkbox" 
                            checked={heartbeatEnabled} 
                            onChange={(e) => setHeartbeatEnabled(e.target.checked)} 
                          />
                          启动心跳保活
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8rem" }}>
                          <span style={{ color: "var(--text-secondary)" }}>时间间隔:</span>
                          <input 
                            type="number" 
                            style={{ width: "60px", height: "26px", fontSize: "0.8rem", padding: "0.2rem" }}
                            value={heartbeatInterval} 
                            onChange={(e) => setHeartbeatInterval(Math.max(1, Number(e.target.value)))} 
                            disabled={!heartbeatEnabled}
                          />
                          <span style={{ color: "var(--text-secondary)" }}>秒</span>
                        </label>
                      </div>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>心跳消息荷载 (Message):</span>
                        <input 
                          type="text" 
                          style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", height: "30px" }}
                          value={heartbeatMessage} 
                          onChange={(e) => setHeartbeatMessage(e.target.value)} 
                          disabled={!heartbeatEnabled}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Connection Metrics */}
        <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <article className="detail-card">
            <h3>状态</h3>
            <p style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span className={stateDotClass(state)} />
              {stateLabel(state)}
            </p>
          </article>
          <article className="detail-card">
            <h3>时长</h3>
            <p className="mono-output" style={{ fontSize: "1.1rem" }}>
              {state === "open" ? formattedDuration : "00:00"}
            </p>
          </article>
          <article className="detail-card">
            <h3>发送消息</h3>
            <p style={{ display: "flex", flexDirection: "column", gap: "0.15rem", lineHeight: "1.2" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: "600" }}>{sentStats.count} 包</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                {sentStats.bytes > 1024 ? `${(sentStats.bytes / 1024).toFixed(2)} KB` : `${sentStats.bytes} B`}
              </span>
            </p>
          </article>
          <article className="detail-card">
            <h3>接收消息</h3>
            <p style={{ display: "flex", flexDirection: "column", gap: "0.15rem", lineHeight: "1.2" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: "600" }}>{recvStats.count} 包</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                {recvStats.bytes > 1024 ? `${(recvStats.bytes / 1024).toFixed(2)} KB` : `${recvStats.bytes} B`}
              </span>
            </p>
          </article>
          <article className="detail-card">
            <h3>协议/子协议</h3>
            <p style={{ fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {socketRef.current?.protocol || "无"}
            </p>
          </article>
        </div>

        {/* Workspace Areas */}
        <div className="ws-grid-2">
          {/* Message Composer Column */}
          <div className="ws-composer-card">
            <div className="segmented-control" style={{ margin: 0 }}>
              <button 
                type="button" 
                className={composerTab === "compose" ? "active" : ""} 
                onClick={() => setComposerTab("compose")}
              >
                编写发送消息
              </button>
              <button 
                type="button" 
                className={composerTab === "presets" ? "active" : ""} 
                onClick={() => setComposerTab("presets")}
              >
                预设模版 ({presets.length})
              </button>
            </div>

            {composerTab === "compose" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="tool-field tool-field--compact" style={{ margin: 0 }}>
                    <span style={{ display: "none" }}>消息格式</span>
                    <select 
                      value={messageMode} 
                      onChange={(e) => setMessageMode(e.target.value as "text" | "json" | "hex" | "base64")}
                      style={{ fontSize: "0.85rem", height: "30px", padding: "0 0.5rem" }}
                    >
                      <option value="text">纯文本 (Text)</option>
                      <option value="json">JSON 对象</option>
                      <option value="hex">十六进制 (Hex/Binary)</option>
                      <option value="base64">Base64 (Binary)</option>
                    </select>
                  </label>
                  
                  {messageMode === "json" && (
                    <button 
                      type="button" 
                      className="button-link" 
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                      onClick={formatJsonMessage}
                      title="美化 JSON 格式"
                    >
                      格式化 JSON
                    </button>
                  )}
                </div>

                <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
                  <textarea 
                    value={message} 
                    onChange={(event) => setMessage(event.target.value)} 
                    spellCheck={false} 
                    style={{ 
                      minHeight: "220px",
                      flex: 1,
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                      borderColor: !inputValidation.valid ? "#ef4444" : "var(--border-default)"
                    }}
                  />
                  {!inputValidation.valid && (
                    <p style={{ color: "#ef4444", fontSize: "0.78rem", margin: "0.25rem 0 0 0" }}>
                      ⚠️ {inputValidation.error}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                  <button 
                    type="button" 
                    className="button--primary"
                    onClick={sendMessage} 
                    style={{ flex: 1 }}
                    disabled={state !== "open" || !inputValidation.valid}
                  >
                    发送消息
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowSavePresetInline(true)}
                    disabled={!message.trim()}
                  >
                    保存为预设
                  </button>
                </div>

                {showSavePresetInline && (
                  <div className="ws-preset-save-form">
                    <label style={{ fontSize: "0.78rem", fontWeight: "600" }}>保存当前载荷为新预设</label>
                    <div className="ws-preset-save-input-group">
                      <input 
                        type="text" 
                        placeholder="输入预设名称 (例如: 用户查询)" 
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        style={{ flex: 1, height: "30px", fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                      />
                      <button 
                        type="button" 
                        className="button--primary"
                        onClick={saveCurrentAsPreset} 
                        disabled={!newPresetName.trim()}
                        style={{ height: "30px", padding: "0 0.75rem", fontSize: "0.8rem" }}
                      >
                        确定
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setShowSavePresetInline(false); setNewPresetName(""); }}
                        style={{ height: "30px", padding: "0 0.75rem", fontSize: "0.8rem" }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Presets View
              <div className="ws-presets-list">
                {presets.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem", padding: "2rem 0" }}>
                    没有可用的模版预设
                  </p>
                ) : (
                  presets.map((preset) => (
                    <div 
                      key={preset.id} 
                      className="ws-preset-item"
                      onClick={() => applyPreset(preset)}
                      title="点击加载到编辑器"
                    >
                      <div className="ws-preset-info">
                        <span className="ws-preset-name">{preset.name}</span>
                        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                          <span className="ws-preset-type-badge">{preset.mode}</span>
                          <span className="mono-output" style={{ fontSize: "0.7rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                            {preset.content.length > 50 ? preset.content.substring(0, 50).replace(/\s+/g, " ") + "..." : preset.content.replace(/\s+/g, " ")}
                          </span>
                        </div>
                      </div>
                      {preset.isCustom && (
                        <button 
                          type="button"
                          className="ws-preset-delete-btn" 
                          onClick={(e) => deletePreset(e, preset.id)}
                          title="删除此预设"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Event Logs & Traffic Monitor Column */}
          <div className="ws-logs-card" style={{ flex: 1 }}>
            <div className="ws-logs-header">
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>通信事件日志</span>
                <span className="pill pill--runtime" data-runtime="realtime" style={{ fontSize: "0.7rem" }}>
                  {filteredLogs.length} 条记录
                </span>
              </h3>
              
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  type="button" 
                  onClick={exportLogs}
                  disabled={logs.length === 0}
                  style={{ fontSize: "0.8rem", padding: "4px 8px", height: "30px" }}
                  title="导出所有日志为 JSON 文件"
                >
                  导出日志
                </button>
                <button 
                  type="button" 
                  onClick={() => setLogs([])} 
                  disabled={logs.length === 0}
                  style={{ fontSize: "0.8rem", padding: "4px 8px", height: "30px" }}
                >
                  清空日志
                </button>
              </div>
            </div>

            {/* Filter controls row */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <div className="segmented-control" style={{ margin: 0, flex: 1, minWidth: "220px", height: "32px", padding: 2 }}>
                <button 
                  type="button" 
                  className={logFilter === "all" ? "active" : ""} 
                  style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                  onClick={() => setLogFilter("all")}
                >
                  全部
                </button>
                <button 
                  type="button" 
                  className={logFilter === "in" ? "active" : ""} 
                  style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                  onClick={() => setLogFilter("in")}
                >
                  接收
                </button>
                <button 
                  type="button" 
                  className={logFilter === "out" ? "active" : ""} 
                  style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                  onClick={() => setLogFilter("out")}
                >
                  发送
                </button>
                <button 
                  type="button" 
                  className={logFilter === "system" ? "active" : ""} 
                  style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                  onClick={() => setLogFilter("system")}
                >
                  系统
                </button>
              </div>

              <input 
                type="text" 
                placeholder="搜索日志内容..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", height: "32px", width: "160px", flexShrink: 0 }}
              />
            </div>

            {/* Events logs container */}
            <div className="tool-table" style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((entry) => (
                  <LogItem 
                    key={entry.id} 
                    entry={entry} 
                    onApplyToComposer={(msg, mode) => {
                      setMessage(msg);
                      setMessageMode(mode);
                    }}
                  />
                ))
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem", padding: "3rem 0" }}>
                  暂无匹配的通信事件
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footnote notes */}
        <p className="tool-note" style={{ margin: "0.5rem 0 0 0" }}>
          提示：本地浏览器环境发起的 WebSocket 连接遵循同源策略与内容混合规范。WSS (Secure WebSocket) 端点无法在普通 HTTP 页面发起连接，且当握手时浏览器会拒绝不受信任的自签名 SSL 证书。
        </p>
      </div>
    </section>
  );
}
