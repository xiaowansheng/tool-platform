"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const ports = [
  { port: 20, service: "FTP 数据", protocol: "TCP" },
  { port: 21, service: "FTP 控制", protocol: "TCP" },
  { port: 22, service: "SSH", protocol: "TCP" },
  { port: 25, service: "SMTP", protocol: "TCP" },
  { port: 53, service: "DNS", protocol: "TCP/UDP" },
  { port: 80, service: "HTTP", protocol: "TCP" },
  { port: 110, service: "POP3", protocol: "TCP" },
  { port: 123, service: "NTP", protocol: "UDP" },
  { port: 143, service: "IMAP", protocol: "TCP" },
  { port: 443, service: "HTTPS", protocol: "TCP" },
  { port: 5432, service: "PostgreSQL", protocol: "TCP" },
  { port: 6379, service: "Redis", protocol: "TCP" },
  { port: 8000, service: "开发服务器", protocol: "TCP" },
  { port: 8080, service: "HTTP 备用端口", protocol: "TCP" },
  { port: 27017, service: "MongoDB", protocol: "TCP" }
];

export default function PortReferenceTool({ manifest }: ToolAppProps) {
  const [query, setQuery] = useState("http");
  const normalized = query.trim().toLowerCase();
  const results = ports.filter((item) =>
    item.port.toString().includes(normalized) ||
    item.service.toLowerCase().includes(normalized) ||
    item.protocol.toLowerCase().includes(normalized)
  );

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络速查</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>端口或服务</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="case-grid">
        {results.map((item) => (
          <article key={item.port} className="detail-card">
            <p className="eyebrow">{item.protocol}</p>
            <h3>{item.port}</h3>
            <p>{item.service}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
