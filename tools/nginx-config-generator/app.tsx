"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function cleanServer(value: string) {
  return value.trim().replace(/^https?:\/\//, "");
}

export default function NginxConfigGeneratorTool({ manifest }: ToolAppProps) {
  const [domain, setDomain] = useState("api.example.com");
  const [upstreams, setUpstreams] = useState("127.0.0.1:3000\n127.0.0.1:3001");
  const [enableSsl, setEnableSsl] = useState(true);
  const [websocket, setWebsocket] = useState(true);
  const [rateLimit, setRateLimit] = useState("10r/s");
  const [copied, setCopied] = useState(false);
  const upstreamList = useMemo(() => upstreams.split(/\r?\n|,/).map(cleanServer).filter(Boolean), [upstreams]);
  const config = useMemo(() => {
    const lines = [
      "upstream " + domain.replace(/[^a-z0-9]/gi, "_") + "_backend {",
      ...upstreamList.map((server) => "  server " + server + ";"),
      "  keepalive 32;",
      "}",
      "",
      rateLimit ? "limit_req_zone $binary_remote_addr zone=api_limit:10m rate=" + rateLimit + ";" : "",
      "",
      "server {",
      "  listen 80;",
      enableSsl ? "  listen 443 ssl http2;" : "",
      "  server_name " + domain + ";",
      enableSsl ? "  ssl_certificate /etc/nginx/certs/" + domain + ".crt;" : "",
      enableSsl ? "  ssl_certificate_key /etc/nginx/certs/" + domain + ".key;" : "",
      rateLimit ? "  limit_req zone=api_limit burst=20 nodelay;" : "",
      "",
      "  location / {",
      "    proxy_pass http://" + domain.replace(/[^a-z0-9]/gi, "_") + "_backend;",
      "    proxy_set_header Host $host;",
      "    proxy_set_header X-Real-IP $remote_addr;",
      "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
      "    proxy_set_header X-Forwarded-Proto $scheme;",
      websocket ? "    proxy_set_header Upgrade $http_upgrade;" : "",
      websocket ? "    proxy_set_header Connection \"upgrade\";" : "",
      "    proxy_connect_timeout 5s;",
      "    proxy_read_timeout 60s;",
      "  }",
      "}"
    ];
    return lines.filter((line) => line !== "").join("\n");
  }, [domain, enableSsl, rateLimit, upstreamList, websocket]);

  async function copyConfig() {
    await navigator.clipboard.writeText(config);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Reverse proxy</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>Domain</span><input value={domain} onChange={(event) => { setDomain(event.target.value); setCopied(false); }} /></label><label className="tool-field tool-field--compact"><span>SSL</span><select value={enableSsl ? "on" : "off"} onChange={(event) => setEnableSsl(event.target.value === "on")}><option value="on">Enabled</option><option value="off">Disabled</option></select></label><label className="tool-field tool-field--compact"><span>WebSocket</span><select value={websocket ? "on" : "off"} onChange={(event) => setWebsocket(event.target.value === "on")}><option value="on">Enabled</option><option value="off">Disabled</option></select></label><label className="tool-field tool-field--compact"><span>Rate limit</span><input value={rateLimit} onChange={(event) => setRateLimit(event.target.value)} /></label><button type="button" onClick={() => void copyConfig()}>{copied ? "Copied config" : "Copy config"}</button></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>Upstream servers</span><textarea value={upstreams} onChange={(event) => setUpstreams(event.target.value)} spellCheck={false} /></label><label className="tool-field"><span>nginx.conf</span><textarea value={config} readOnly spellCheck={false} /></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>Upstreams</h3><p>{upstreamList.length}</p></article><article className="detail-card"><h3>SSL</h3><p>{enableSsl ? "enabled" : "disabled"}</p></article><article className="detail-card"><h3>WebSocket</h3><p>{websocket ? "enabled" : "disabled"}</p></article></div>
    </section>
  );
}
