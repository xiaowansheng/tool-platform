"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ScanResult {
  port: number;
  status: "open" | "closed";
}

interface UdpResponseItem {
  rinfo: {
    address: string;
    port: number;
    family: string;
    size: number;
  };
  response: {
    text: string;
    hex: string;
    base64: string;
  };
}

const PORT_SERVICES: Record<number, string> = {
  21: "FTP (文件传输)",
  22: "SSH (安全外壳)",
  23: "Telnet (远程终端)",
  25: "SMTP (简单邮件传输)",
  53: "DNS (域名系统)",
  80: "HTTP (Web 服务)",
  110: "POP3 (邮局协议)",
  123: "NTP (网络时间)",
  143: "IMAP (网际邮件访问)",
  443: "HTTPS (安全 Web)",
  1433: "MSSQL (SQL Server 数据库)",
  1521: "Oracle 数据库",
  3306: "MySQL 数据库",
  5432: "PostgreSQL 数据库",
  6379: "Redis 缓存",
  8080: "HTTP Proxy (代理/备用)",
  8443: "HTTPS 备用",
  11211: "Memcached 缓存",
  27017: "MongoDB 数据库"
};

const PRESET_TCP_TEMPLATES = [
  {
    name: "HTTP GET 请求 (Port 80)",
    port: 80,
    payload: "GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n",
    mode: "text"
  },
  {
    name: "Redis PING 握手 (Port 6379)",
    port: 6379,
    payload: "*1\r\n$4\r\nPING\r\n",
    mode: "text"
  },
  {
    name: "Memcached STATS 状态 (Port 11211)",
    port: 11211,
    payload: "stats\r\nquit\r\n",
    mode: "text"
  },
  {
    name: "十六进制字节帧示例",
    port: 80,
    payload: "00 ff a1 5b 0d 0a",
    mode: "hex"
  }
];

export default function TcpUdpClientTool({ manifest }: ToolAppProps) {
  // Tabs: tcp / udp / scan
  const [activeTab, setActiveTab] = useState<"tcp" | "udp" | "scan">("tcp");

  // Common inputs
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("80");
  const [timeout, setTimeoutVal] = useState("3000");
  const [payload, setPayload] = useState("Hello Server!");
  const [payloadType, setPayloadType] = useState<"text" | "hex" | "base64">("text");

  // TCP Result states
  const [tcpResult, setTcpResult] = useState<{
    elapsed: number;
    response: { text: string; hex: string; base64: string };
  } | null>(null);
  const [tcpTab, setTcpTab] = useState<"text" | "hex" | "base64">("text");

  // UDP Result states
  const [udpResults, setUdpResults] = useState<UdpResponseItem[]>([]);
  const [udpTab, setUdpTab] = useState<"text" | "hex" | "base64">("text");

  // Scanner states
  const [scanHost, setScanHost] = useState("127.0.0.1");
  const [scanType, setScanType] = useState<"common" | "db" | "custom">("common");
  const [customPorts, setCustomPorts] = useState("80, 443, 3000, 8080");
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);

  // System states
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Payload validator
  const payloadValidation = useMemo(() => {
    if (!payload) return { valid: true, error: "" };
    if (payloadType === "hex") {
      const cleanHex = payload.replace(/\s+|0x/g, "");
      if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
        return { valid: false, error: "十六进制包含非法字符 (只能是 0-9, a-f, A-F)" };
      }
      if (cleanHex.length % 2 !== 0) {
        return { valid: false, error: "十六进制字符个数必须为偶数" };
      }
    }
    if (payloadType === "base64") {
      try {
        atob(payload.trim());
      } catch {
        return { valid: false, error: "无效的 Base64 编码格式" };
      }
    }
    return { valid: true, error: "" };
  }, [payload, payloadType]);

  // Execute TCP request
  const handleTcpSend = async () => {
    if (!host.trim() || !port.trim()) {
      setError("请输入目标主机 IP 和端口");
      return;
    }

    setBusy(true);
    setError("");
    setTcpResult(null);

    try {
      const response = await fetch("/api/network-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tcp-send",
          host: host.trim(),
          port: parseInt(port),
          payload,
          payloadType,
          timeout: parseInt(timeout)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `请求失败，状态码: ${response.status}`);
      }

      setTcpResult({
        elapsed: data.elapsed,
        response: data.response
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接/发送数据超时或失败");
    } finally {
      setBusy(false);
    }
  };

  // Execute UDP request
  const handleUdpSend = async () => {
    if (!host.trim() || !port.trim()) {
      setError("请输入目标主机 IP 和端口");
      return;
    }

    setBusy(true);
    setError("");
    setUdpResults([]);

    try {
      const response = await fetch("/api/network-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "udp-send",
          host: host.trim(),
          port: parseInt(port),
          payload,
          payloadType,
          timeout: parseInt(timeout)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `UDP 发送失败，状态码: ${response.status}`);
      }

      setUdpResults(data.responses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送 UDP 数据包失败");
    } finally {
      setBusy(false);
    }
  };

  // Execute Port Scanning
  const handlePortScan = async () => {
    if (!scanHost.trim()) {
      setError("请输入要扫描的主机 IP 或域名");
      return;
    }

    setBusy(true);
    setError("");
    setScanResults([]);

    // Determine target ports list
    let targetPorts: number[] = [];
    if (scanType === "common") {
      targetPorts = [21, 22, 23, 25, 53, 80, 110, 123, 143, 443];
    } else if (scanType === "db") {
      targetPorts = [1433, 1521, 3306, 5432, 6379, 11211, 27017];
    } else {
      targetPorts = customPorts
        .split(",")
        .map(p => parseInt(p.trim()))
        .filter(p => !isNaN(p) && p > 0 && p <= 65535);
    }

    if (targetPorts.length === 0) {
      setError("无有效的端口可供扫描。请输入正确的端口列表（例如 80, 443）");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/network-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "port-scan",
          host: scanHost.trim(),
          ports: targetPorts
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `扫描失败，状态码: ${response.status}`);
      }

      setScanResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "扫描网络端口发生异常");
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = (tpl: typeof PRESET_TCP_TEMPLATES[0]) => {
    setPort(String(tpl.port));
    setPayload(tpl.payload);
    setPayloadType(tpl.mode as "text" | "hex" | "base64");
  };

  return (
    <section className="tool-panel">
      {/* Custom Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .net-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .net-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .net-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .net-grid-2 {
            grid-template-columns: 1fr 1.2fr;
          }
        }
        .net-status-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .net-status-badge--open {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
        }
        .net-status-badge--closed {
          background: rgba(107, 114, 128, 0.12);
          color: var(--text-secondary);
        }
        .net-udp-packet {
          border: 1px solid var(--border-default);
          background: var(--bg-muted);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .net-udp-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.35rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.25rem;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络套接字与端口分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "在 Web 界面远程向 TCP/UDP 服务端口发送自定义指令报文，接收返回数据，并进行 TCP 端口扫描排查。"}</p>
      </div>

      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={activeTab === "tcp" ? "active" : ""} onClick={() => { setActiveTab("tcp"); setError(""); }}>
          TCP 客户端 (流连接)
        </button>
        <button type="button" className={activeTab === "udp" ? "active" : ""} onClick={() => { setActiveTab("udp"); setError(""); }}>
          UDP 客户端 (无连接)
        </button>
        <button type="button" className={activeTab === "scan" ? "active" : ""} onClick={() => { setActiveTab("scan"); setError(""); }}>
          TCP 端口扫描器
        </button>
      </div>

      <div className="net-container">
        {/* TCP/UDP Client UI */}
        {(activeTab === "tcp" || activeTab === "udp") && (
          <div className="net-grid-2">
            {/* Left Column: Config & Payload */}
            <div className="net-card">
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                {activeTab === "tcp" ? "TCP 目标与荷载配置" : "UDP 目标与荷载配置"}
              </h3>

              <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", margin: 0 }}>
                <label className="tool-field tool-field--compact" style={{ gridColumn: "span 2" }}>
                  <span>目标 IP / 主机名</span>
                  <input value={host} onChange={e => setHost(e.target.value)} placeholder="127.0.0.1 或 localhost" />
                </label>
                <label className="tool-field tool-field--compact">
                  <span>目标端口 Port</span>
                  <input value={port} onChange={e => setPort(e.target.value)} placeholder="80" />
                </label>
                <label className="tool-field tool-field--compact">
                  <span>响应超时 (毫秒)</span>
                  <input value={timeout} onChange={e => setTimeoutVal(e.target.value)} placeholder="3000" />
                </label>
              </div>

              {/* Presets for TCP */}
              {activeTab === "tcp" && (
                <label className="tool-field tool-field--compact">
                  <span>选择协议请求快捷模版</span>
                  <select onChange={e => {
                    const idx = parseInt(e.target.value);
                    if (!isNaN(idx)) applyTemplate(PRESET_TCP_TEMPLATES[idx]);
                  }} defaultValue="">
                    <option value="" disabled>-- 选择测试报文 --</option>
                    {PRESET_TCP_TEMPLATES.map((tpl, i) => (
                      <option key={i} value={i}>{tpl.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Payload composer */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="tool-field tool-field--compact" style={{ margin: 0 }}>
                    <select 
                      value={payloadType} 
                      onChange={e => setPayloadType(e.target.value as "text" | "hex" | "base64")}
                      style={{ fontSize: "0.825rem", height: "28px" }}
                    >
                      <option value="text">文本 (UTF-8)</option>
                      <option value="hex">十六进制 (Hex)</option>
                      <option value="base64">Base64</option>
                    </select>
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>发送数据载荷 (Payload)</span>
                </div>

                <textarea 
                  value={payload} 
                  onChange={e => setPayload(e.target.value)} 
                  spellCheck={false}
                  style={{ 
                    minHeight: "130px", 
                    fontFamily: "var(--font-mono), monospace", 
                    fontSize: "0.85rem",
                    borderColor: !payloadValidation.valid ? "#ef4444" : "var(--border-default)"
                  }}
                />
                {!payloadValidation.valid && (
                  <p style={{ color: "#ef4444", fontSize: "0.78rem", margin: 0 }}>⚠️ {payloadValidation.error}</p>
                )}
              </div>

              <button 
                type="button" 
                className="button--primary" 
                onClick={activeTab === "tcp" ? handleTcpSend : handleUdpSend}
                disabled={busy || !payloadValidation.valid}
                style={{ marginTop: "0.5rem" }}
              >
                {busy ? "发送中..." : activeTab === "tcp" ? "连接并发送 TCP 数据" : "发送 UDP 数据包"}
              </button>
            </div>

            {/* Right Column: Results Display */}
            <div className="net-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>响应输出 (Output)</h3>
                {activeTab === "tcp" && tcpResult && (
                  <span className="pill pill--runtime" data-runtime="realtime" style={{ fontSize: "0.72rem" }}>
                    时耗: {tcpResult.elapsed} ms
                  </span>
                )}
              </div>

              {activeTab === "tcp" ? (
                /* TCP Results panel */
                tcpResult ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className="segmented-control" style={{ margin: 0, padding: 2, height: "auto" }}>
                      <button 
                        type="button" 
                        className={tcpTab === "text" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => setTcpTab("text")}
                      >
                        文本视图 (Text)
                      </button>
                      <button 
                        type="button" 
                        className={tcpTab === "hex" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => setTcpTab("hex")}
                      >
                        十六进制视图 (Hex)
                      </button>
                      <button 
                        type="button" 
                        className={tcpTab === "base64" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => setTcpTab("base64")}
                      >
                        Base64 视图
                      </button>
                    </div>

                    <textarea 
                      value={tcpResult.response[tcpTab]}
                      readOnly 
                      spellCheck={false}
                      style={{ 
                        minHeight: "260px", 
                        fontFamily: "var(--font-mono), monospace", 
                        fontSize: "0.825rem",
                        backgroundColor: "var(--bg-muted)",
                        lineHeight: 1.4
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    minHeight: "260px",
                    border: "2px dashed var(--border-default)", 
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem"
                  }}>
                    请配置参数并点击发送，响应数据将展示在此处。
                  </div>
                )
              ) : (
                /* UDP Results panel */
                udpResults.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className="segmented-control" style={{ margin: 0, padding: 2, height: "auto" }}>
                      <button 
                        type="button" 
                        className={udpTab === "text" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => setUdpTab("text")}
                      >
                        文本 (Text)
                      </button>
                      <button 
                        type="button" 
                        className={udpTab === "hex" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => setUdpTab("hex")}
                      >
                        十六进制 (Hex)
                      </button>
                      <button 
                        type="button" 
                        className={udpTab === "base64" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => setUdpTab("base64")}
                      >
                        Base64
                      </button>
                    </div>

                    <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                      {udpResults.map((item, idx) => (
                        <div key={idx} className="net-udp-packet">
                          <div className="net-udp-meta">
                            <span>来自: {item.rinfo.address}:{item.rinfo.port}</span>
                            <span>大小: {item.rinfo.size} B</span>
                          </div>
                          <div className="mono-output" style={{ fontSize: "0.8rem", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
                            {item.response[udpTab]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    minHeight: "260px",
                    border: "2px dashed var(--border-default)", 
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem"
                  }}>
                    请发送 UDP 数据包，接收到的响应将列表展示在此。
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Port Scanner UI */}
        {activeTab === "scan" && (
          <div className="net-grid-2">
            {/* Config Scan */}
            <div className="net-card">
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>扫描参数配置</h3>

              <label className="tool-field">
                <span>目标主机 IP / 域名</span>
                <input value={scanHost} onChange={e => setScanHost(e.target.value)} placeholder="127.0.0.1 或 localhost" />
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>选择要扫描的端口范围：</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input type="radio" name="scanType" checked={scanType === "common"} onChange={() => setScanType("common")} />
                    <span>常用基础协议端口 (21, 22, 23, 25, 53, 80, 110, 123, 143, 443)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input type="radio" name="scanType" checked={scanType === "db"} onChange={() => setScanType("db")} />
                    <span>常用数据库与缓存服务 (1433, 1521, 3306, 5432, 6379, 11211, 27017)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input type="radio" name="scanType" checked={scanType === "custom"} onChange={() => setScanType("custom")} />
                    <span>自定义指定端口</span>
                  </label>
                </div>
              </div>

              {scanType === "custom" && (
                <label className="tool-field">
                  <span>自定义端口列表 (逗号分隔)</span>
                  <input value={customPorts} onChange={e => setCustomPorts(e.target.value)} placeholder="80, 443, 3000, 8080" />
                </label>
              )}

              <button 
                type="button" 
                className="button--primary" 
                onClick={handlePortScan}
                disabled={busy}
                style={{ marginTop: "0.5rem" }}
              >
                {busy ? "扫描中..." : "开始快速端口扫描"}
              </button>
            </div>

            {/* Scan Results */}
            <div className="net-card">
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>扫描结果列表 (Results)</h3>

              <div className="tool-table" style={{ maxHeight: "320px", overflowY: "auto" }}>
                <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "80px 1fr 90px" }}>
                  <span>端口</span>
                  <span>服务名称</span>
                  <span>状态</span>
                </div>
                {scanResults.length > 0 ? (
                  scanResults.map((item) => (
                    <div key={item.port} className="tool-table__row" style={{ gridTemplateColumns: "80px 1fr 90px" }}>
                      <span className="mono-output" style={{ fontWeight: "600" }}>{item.port}</span>
                      <span style={{ fontSize: "0.85rem" }}>{PORT_SERVICES[item.port] || "未知服务"}</span>
                      <div>
                        <span className={`net-status-badge ${
                          item.status === "open" ? "net-status-badge--open" : "net-status-badge--closed"
                        }`}>
                          {item.status === "open" ? "● 开放 (Open)" : "关闭 (Closed)"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem", padding: "3rem 0" }}>
                    暂无扫描结果，设置参数并点击开始扫描以获取端口开闭状况。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
