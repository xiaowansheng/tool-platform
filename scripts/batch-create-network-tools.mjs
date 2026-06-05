import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");

const tools = [
  // ================================================================
  // IP Geolocation
  // ================================================================
  {
    id: "ip-geolocation", name: "IP Geolocation",
    category: "webmaster-tools", subCategory: "ip",
    tags: ["ip", "geolocation", "geoip", "location", "network"],
    icon: "map-pin", runtime: "simple",
    description: "通过 IP 地址查询地理位置、ISP 和时区等信息，支持 IPv4 和 IPv6。",
    manifestExtra: "  capabilities: [\"geoip-lookup\"],\n  permissions: []",
    app: ipGeolocationApp,
  },
  // ================================================================
  // MAC Address Vendor Lookup
  // ================================================================
  {
    id: "mac-address-lookup", name: "MAC Address Lookup",
    category: "webmaster-tools", subCategory: "reference",
    tags: ["mac", "oui", "vendor", "network", "hardware"],
    icon: "network", runtime: "simple",
    description: "查询 MAC 地址前缀（OUI）对应的设备厂商信息，支持批量查询。",
    manifestExtra: "  capabilities: [\"mac-oui-lookup\"],\n  permissions: []",
    app: macAddressLookupApp,
  },
  // ================================================================
  // HTTP Request Inspector
  // ================================================================
  {
    id: "http-request-inspector", name: "HTTP Request Inspector",
    category: "webmaster-tools", subCategory: "http",
    tags: ["http", "request", "headers", "response", "debug", "network"],
    icon: "radio-tower", runtime: "simple",
    description: "发送自定义 HTTP 请求并查看完整的响应头、状态码、重定向链和响应体。",
    manifestExtra: "  capabilities: [\"http-request\"],\n  permissions: []",
    app: httpRequestInspectorApp,
  },
  // ================================================================
  // HTTP Redirect Tracker
  // ================================================================
  {
    id: "http-redirect-tracker", name: "HTTP Redirect Tracker",
    category: "webmaster-tools", subCategory: "http",
    tags: ["http", "redirect", "301", "302", "seo", "network"],
    icon: "git-branch", runtime: "simple",
    description: "追踪 HTTP 重定向链，查看每一步的状态码、URL 跳转和响应头变化。",
    manifestExtra: "  capabilities: [\"redirect-trace\"],\n  permissions: []",
    app: httpRedirectTrackerApp,
  },
  // ================================================================
  // Network Bandwidth Calculator
  // ================================================================
  {
    id: "network-bandwidth-calculator", name: "Bandwidth Calculator",
    category: "webmaster-tools", subCategory: "calculator",
    tags: ["bandwidth", "network", "calculator", "transfer", "speed"],
    icon: "gauge", runtime: "simple",
    description: "计算网络传输时间、数据大小与带宽之间的换算，支持多种单位。",
    manifestExtra: "  permissions: []",
    app: bandwidthCalculatorApp,
  },
  // ================================================================
  // IPv6 Subnet Calculator
  // ================================================================
  {
    id: "ipv6-subnet-calculator", name: "IPv6 Subnet Calculator",
    category: "webmaster-tools", subCategory: "ip",
    tags: ["ipv6", "subnet", "cidr", "network", "calculator"],
    icon: "network", runtime: "simple",
    description: "计算 IPv6 网段信息：前缀、子网掩码、地址总数与范围，支持缩写展开。",
    manifestExtra: "  permissions: []",
    app: ipv6SubnetCalculatorApp,
  },
  // ================================================================
  // Network Connection Info
  // ================================================================
  {
    id: "network-connection-info", name: "Network Connection Info",
    category: "ops-tools", subCategory: "diagnostics",
    tags: ["network", "connection", "bandwidth", "rtt", "diagnostics"],
    icon: "activity", runtime: "simple",
    description: "查看浏览器 Network Information API 提供的连接类型、下行速度、RTT 等实时网络状态。",
    manifestExtra: "  capabilities: [\"network-info-api\"],\n  permissions: []",
    app: networkConnectionInfoApp,
  },
];

// ================================================================
// Tool implementations
// ================================================================

function ipGeolocationApp() {
  return `"use client";

import { useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface GeoIPResult {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

interface QueryRecord {
  ip: string;
  result: GeoIPResult | null;
  error: string;
  time: string;
}

export default function IpGeolocationTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookup() {
    const ips = query.trim().split(/[\\n, ]+/).filter(Boolean);
    if (ips.length === 0) { setError("请输入 IP 地址"); return; }
    setBusy(true); setError("");

    const records: QueryRecord[] = [];
    for (const ip of ips) {
      try {
        const res = await fetch(\`https://ip-api.com/json/\${encodeURIComponent(ip)}?fields=query,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as\`);
        const data = await res.json() as GeoIPResult & { status?: string };
        records.push({
          ip: data.query || ip,
          result: data.status === "success" ? data : null,
          error: data.status === "fail" ? "查询失败" : "",
          time: new Date().toLocaleTimeString(),
        });
      } catch (e) {
        records.push({ ip, result: null, error: e instanceof Error ? e.message : "请求失败", time: new Date().toLocaleTimeString() });
      }
    }

    setResults(prev => [...records, ...prev].slice(0, 50));
    setBusy(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>IP 地址</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="8.8.8.8，多个用逗号或换行分隔" />
        </label>
        <button type="button" className="button--primary" onClick={lookup} disabled={busy}>{busy ? "查询中..." : "查询"}</button>
      </div>
      {results.length > 0 ? results.map((r, i) => (
        <div key={i} className="detail-card" style={{ marginTop: 8 }}>
          <h3>{r.ip} <span className="mono-output" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.time}</span></h3>
          {r.result ? (
            <div className="detail-grid">
              <article><h4>国家</h4><p>{r.result.country} ({r.result.countryCode})</p></article>
              <article><h4>地区/城市</h4><p>{r.result.regionName} / {r.result.city}</p></article>
              <article><h4>坐标</h4><p>{r.result.lat}, {r.result.lon}</p></article>
              <article><h4>时区</h4><p>{r.result.timezone}</p></article>
              <article><h4>ISP</h4><p>{r.result.isp}</p></article>
              <article><h4>组织</h4><p>{r.result.org}</p></article>
              <article><h4>AS</h4><p>{r.result.as}</p></article>
              <article><h4>邮编</h4><p>{r.result.zip || "-"}</p></article>
            </div>
          ) : <p className="tool-error">{r.error}</p>}
        </div>
      )) : <p className="tool-note">输入 IP 地址查询地理位置信息，使用 ip-api.com 免费服务。</p>}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
`;
}

function macAddressLookupApp() {
  return `"use client";

import { useRef, useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface OUIEntry {
  macPrefix: string;
  vendor: string;
}

const OUI_DATABASE: OUIEntry[] = [
  { macPrefix: "00:00:0C", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:00:1B", vendor: "Novell, Inc." },
  { macPrefix: "00:00:5E", vendor: "IANA" },
  { macPrefix: "00:01:2E", vendor: "Thomson Telecom" },
  { macPrefix: "00:01:42", vendor: "Google, Inc." },
  { macPrefix: "00:01:97", vendor: "Dell Inc." },
  { macPrefix: "00:02:6B", vendor: "IBM Corp" },
  { macPrefix: "00:03:93", vendor: "Apple, Inc." },
  { macPrefix: "00:04:AC", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "00:05:1C", vendor: "Intel Corporate" },
  { macPrefix: "00:05:B8", vendor: "LG Electronics" },
  { macPrefix: "00:07:E9", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:08:02", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "00:08:1B", vendor: "Sony Corporation" },
  { macPrefix: "00:08:E3", vendor: "Xerox Corporation" },
  { macPrefix: "00:09:5B", vendor: "Hewlett-Packard Company" },
  { macPrefix: "00:0A:27", vendor: "Panasonic Communications Co., Ltd" },
  { macPrefix: "00:0A:95", vendor: "Nokia Corporation" },
  { macPrefix: "00:0B:6B", vendor: "Oracle Corporation" },
  { macPrefix: "00:0C:29", vendor: "VMware, Inc." },
  { macPrefix: "00:0D:3A", vendor: "Brocade Communications Systems, Inc" },
  { macPrefix: "00:0E:07", vendor: "Toshiba Corporation" },
  { macPrefix: "00:0E:8C", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:0F:1F", vendor: "Juniper Networks" },
  { macPrefix: "00:10:18", vendor: "Nortel Networks" },
  { macPrefix: "00:10:DB", vendor: "Netgear, Inc." },
  { macPrefix: "00:11:22", vendor: "Xerox" },
  { macPrefix: "00:11:50", vendor: "D-Link Corporation" },
  { macPrefix: "00:11:92", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "00:11:5C", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "00:12:17", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "00:12:CE", vendor: "Microsoft Corporation" },
  { macPrefix: "00:13:CF", vendor: "Ericsson AB" },
  { macPrefix: "00:14:22", vendor: "Dell Inc." },
  { macPrefix: "00:14:5C", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:15:6D", vendor: "Roku, Inc." },
  { macPrefix: "00:15:E9", vendor: "Nokia Danmark A/S" },
  { macPrefix: "00:16:CB", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "00:17:32", vendor: "HTC Corporation" },
  { macPrefix: "00:18:0A", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:18:DE", vendor: "Espressif Inc." },
  { macPrefix: "00:19:07", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "00:1A:11", vendor: "Google, Inc." },
  { macPrefix: "00:1A:A0", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:1B:63", vendor: "Intel Corporate" },
  { macPrefix: "00:1C:10", vendor: "Belkin International Inc." },
  { macPrefix: "00:1D:72", vendor: "Rakuten, Inc." },
  { macPrefix: "00:1E:06", vendor: "Panasonic Corporation" },
  { macPrefix: "00:1E:52", vendor: "Roku, Inc." },
  { macPrefix: "00:1E:65", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "00:1F:29", vendor: "ZyXEL Communications Corporation" },
  { macPrefix: "00:1F:C6", vendor: "Broadcom Corporation" },
  { macPrefix: "00:20:ED", vendor: "IBM Corp" },
  { macPrefix: "00:21:2F", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "00:21:63", vendor: "Apple, Inc." },
  { macPrefix: "00:21:6A", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:22:15", vendor: "Sony Mobile Communications AB" },
  { macPrefix: "00:22:2D", vendor: "LG Electronics" },
  { macPrefix: "00:22:4D", vendor: "Dell Inc." },
  { macPrefix: "00:22:6B", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "00:22:75", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "00:22:9F", vendor: "ZTE Corporation" },
  { macPrefix: "00:23:14", vendor: "Xerox Corporation" },
  { macPrefix: "00:23:5A", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "00:23:67", vendor: "Canon Inc." },
  { macPrefix: "00:24:21", vendor: "HTC Corporation" },
  { macPrefix: "00:24:36", vendor: "Microsoft Corporation" },
  { macPrefix: "00:24:A4", vendor: "Netgear, Inc." },
  { macPrefix: "00:24:E8", vendor: "Intel Corporate" },
  { macPrefix: "00:25:22", vendor: "RIM" },
  { macPrefix: "00:25:36", vendor: "Google, Inc." },
  { macPrefix: "00:25:64", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:25:90", vendor: "D-Link Corporation" },
  { macPrefix: "00:25:9E", vendor: "Hon Hai Precision Ind. Co., Ltd" },
  { macPrefix: "00:26:08", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "00:26:5A", vendor: "Toshiba Corporation" },
  { macPrefix: "00:26:BB", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "00:26:C6", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:26:EB", vendor: "Belkin International Inc." },
  { macPrefix: "00:27:10", vendor: "Microsoft Corporation" },
  { macPrefix: "00:27:13", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "00:27:19", vendor: "Dell Inc." },
  { macPrefix: "00:27:22", vendor: "Sony Ericsson Mobile Communications" },
  { macPrefix: "00:27:F8", vendor: "Amazon Technologies Inc." },
  { macPrefix: "00:28:F8", vendor: "ZyXEL Communications Corporation" },
  { macPrefix: "00:29:04", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:29:61", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "00:29:F3", vendor: "IBM Corp" },
  { macPrefix: "00:2A:6C", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "00:2A:D8", vendor: "Roku, Inc." },
  { macPrefix: "00:2B:2D", vendor: "Nokia Corporation" },
  { macPrefix: "00:2B:67", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "00:2C:2D", vendor: "Dell Inc." },
  { macPrefix: "00:2C:54", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:2C:78", vendor: "Intel Corporate" },
  { macPrefix: "00:2D:31", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "00:2D:8B", vendor: "Google, Inc." },
  { macPrefix: "00:2E:17", vendor: "Microsoft Corporation" },
  { macPrefix: "00:2E:59", vendor: "LG Electronics" },
  { macPrefix: "00:2E:6F", vendor: "Hewlett-Packard Company" },
  { macPrefix: "00:2F:6B", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "00:30:5A", vendor: "Cisco Systems, Inc" },
  { macPrefix: "00:30:65", vendor: "Juniper Networks" },
  { macPrefix: "00:30:95", vendor: "Buffalo Inc." },
  { macPrefix: "00:30:F1", vendor: "NEC Corporation" },
  { macPrefix: "04:4B:ED", vendor: "Amazon Technologies Inc." },
  { macPrefix: "04:4F:4C", vendor: "HP Inc." },
  { macPrefix: "04:52:F3", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "04:56:A5", vendor: "Roku, Inc." },
  { macPrefix: "04:81:8D", vendor: "Amazon Technologies Inc." },
  { macPrefix: "04:92:E3", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "04:9F:3E", vendor: "HTC Corporation" },
  { macPrefix: "04:A1:51", vendor: "Cisco Systems, Inc" },
  { macPrefix: "04:C5:A4", vendor: "Dell Inc." },
  { macPrefix: "04:D3:B0", vendor: "Google, Inc." },
  { macPrefix: "04:F0:21", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "08:00:20", vendor: "Sun Microsystems" },
  { macPrefix: "08:00:27", vendor: "Oracle Corporation (VirtualBox)" },
  { macPrefix: "08:00:46", vendor: "Sony Corporation" },
  { macPrefix: "08:05:02", vendor: "Cisco Systems, Inc" },
  { macPrefix: "08:10:78", vendor: "Espressif Inc." },
  { macPrefix: "08:18:1A", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "08:1F:71", vendor: "Texas Instruments" },
  { macPrefix: "08:26:AE", vendor: "Roku, Inc." },
  { macPrefix: "08:27:8B", vendor: "Microsoft Corporation" },
  { macPrefix: "08:3E:8E", vendor: "Amazon Technologies Inc." },
  { macPrefix: "08:4A:CF", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "08:5A:5A", vendor: "Belkin International Inc." },
  { macPrefix: "08:61:6F", vendor: "Netgear, Inc." },
  { macPrefix: "08:6D:41", vendor: "D-Link Corporation" },
  { macPrefix: "08:74:02", vendor: "Intel Corporate" },
  { macPrefix: "08:7A:4C", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "08:96:AD", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "08:9E:08", vendor: "Google, Inc." },
  { macPrefix: "08:A8:FD", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "08:BE:09", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "08:CC:68", vendor: "Cisco Systems, Inc" },
  { macPrefix: "08:D2:3E", vendor: "LG Electronics" },
  { macPrefix: "08:EA:40", vendor: "HP Inc." },
  { macPrefix: "0C:37:DC", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "0C:39:5B", vendor: "D-Link Corporation" },
  { macPrefix: "0C:4D:E9", vendor: "Intel Corporate" },
  { macPrefix: "0C:54:15", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "0C:6E:4F", vendor: "Roku, Inc." },
  { macPrefix: "0C:72:8B", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "0C:76:6E", vendor: "Belkin International Inc." },
  { macPrefix: "0C:7A:3E", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "0C:84:DC", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "0C:9D:56", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "0C:B3:19", vendor: "Microsoft Corporation" },
  { macPrefix: "0C:D5:02", vendor: "Netgear, Inc." },
  { macPrefix: "0C:D6:BD", vendor: "Google, Inc." },
  { macPrefix: "10:02:B5", vendor: "Intel Corporate" },
  { macPrefix: "10:04:4B", vendor: "HTC Corporation" },
  { macPrefix: "10:05:CA", vendor: "Cisco Systems, Inc" },
  { macPrefix: "10:0D:7F", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "10:13:EE", vendor: "Microsoft Corporation" },
  { macPrefix: "10:1C:0C", vendor: "Amazon Technologies Inc." },
  { macPrefix: "10:2C:6B", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "10:2F:6B", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "10:3C:D5", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "10:3D:1C", vendor: "D-Link Corporation" },
  { macPrefix: "10:3E:97", vendor: "HP Inc." },
  { macPrefix: "10:48:B1", vendor: "Sony Corporation" },
  { macPrefix: "10:50:72", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "10:54:6A", vendor: "Espressif Inc." },
  { macPrefix: "10:68:3F", vendor: "ZTE Corporation" },
  { macPrefix: "10:6F:D9", vendor: "Roku, Inc." },
  { macPrefix: "10:7C:61", vendor: "LG Electronics" },
  { macPrefix: "10:83:D2", vendor: "Google, Inc." },
  { macPrefix: "10:98:36", vendor: "Dell Inc." },
  { macPrefix: "10:9A:DD", vendor: "Cisco Systems, Inc" },
  { macPrefix: "10:A4:BE", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "10:B7:13", vendor: "Netgear, Inc." },
  { macPrefix: "10:C5:95", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "10:C6:1E", vendor: "Nokia Corporation" },
  { macPrefix: "10:D0:5A", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "10:D5:42", vendor: "Texas Instruments" },
  { macPrefix: "10:DA:43", vendor: "Intel Corporate" },
  { macPrefix: "10:E2:D1", vendor: "Hewlett-Packard Company" },
  { macPrefix: "10:E7:C6", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "10:ED:22", vendor: "Apple, Inc." },
  { macPrefix: "10:F0:05", vendor: "Buffalo Inc." },
  { macPrefix: "14:08:74", vendor: "Intel Corporate" },
  { macPrefix: "14:20:5E", vendor: "D-Link Corporation" },
  { macPrefix: "14:22:DB", vendor: "Dell Inc." },
  { macPrefix: "14:30:C6", vendor: "Amazon Technologies Inc." },
  { macPrefix: "14:3D:F2", vendor: "HTC Corporation" },
  { macPrefix: "14:58:D0", vendor: "Cisco Systems, Inc" },
  { macPrefix: "14:59:C0", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "14:5A:5C", vendor: "Netgear, Inc." },
  { macPrefix: "14:6B:9C", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "14:7D:DA", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "14:82:CA", vendor: "Espressif Inc." },
  { macPrefix: "14:8F:21", vendor: "Belkin International Inc." },
  { macPrefix: "14:94:42", vendor: "Apple, Inc." },
  { macPrefix: "14:99:E2", vendor: "Google, Inc." },
  { macPrefix: "14:9F:B8", vendor: "Roku, Inc." },
  { macPrefix: "14:A3:1B", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "14:A7:8B", vendor: "LG Electronics" },
  { macPrefix: "14:B3:1F", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "14:BF:85", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "14:C1:4E", vendor: "Microsoft Corporation" },
  { macPrefix: "14:CF:E2", vendor: "Texas Instruments" },
  { macPrefix: "14:D1:9A", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "14:D6:4D", vendor: "Sony Corporation" },
  { macPrefix: "14:DD:A9", vendor: "IBM Corp" },
  { macPrefix: "14:EB:B6", vendor: "D-Link Corporation" },
  { macPrefix: "14:F0:C5", vendor: "ZTE Corporation" },
  { macPrefix: "14:F6:5A", vendor: "HP Inc." },
  { macPrefix: "18:03:73", vendor: "Cisco Systems, Inc" },
  { macPrefix: "18:0A:FB", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "18:0E:35", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "18:14:2E", vendor: "LG Electronics" },
  { macPrefix: "18:1D:EA", vendor: "Dell Inc." },
  { macPrefix: "18:1E:78", vendor: "Espressif Inc." },
  { macPrefix: "18:1F:5D", vendor: "Intel Corporate" },
  { macPrefix: "18:26:26", vendor: "Roku, Inc." },
  { macPrefix: "18:28:61", vendor: "Belkin International Inc." },
  { macPrefix: "18:2E:44", vendor: "HTC Corporation" },
  { macPrefix: "18:2F:67", vendor: "Google, Inc." },
  { macPrefix: "18:3A:2D", vendor: "HP Inc." },
  { macPrefix: "18:3D:A2", vendor: "Amazon Technologies Inc." },
  { macPrefix: "18:3E:EF", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "18:41:26", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "18:45:1D", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "18:46:65", vendor: "Netgear, Inc." },
  { macPrefix: "18:4F:32", vendor: "Microsoft Corporation" },
  { macPrefix: "18:52:35", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "18:5E:0F", vendor: "D-Link Corporation" },
  { macPrefix: "18:60:24", vendor: "Apple, Inc." },
  { macPrefix: "18:67:B0", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "18:6A:DA", vendor: "Sony Corporation" },
  { macPrefix: "18:6F:F8", vendor: "Texas Instruments" },
  { macPrefix: "18:7A:93", vendor: "IBM Corp" },
  { macPrefix: "18:80:F5", vendor: "Nokia Corporation" },
  { macPrefix: "18:87:96", vendor: "Buffalo Inc." },
  { macPrefix: "18:8B:9D", vendor: "Panasonic Corporation" },
  { macPrefix: "18:92:2C", vendor: "Intel Corporate" },
  { macPrefix: "18:96:5E", vendor: "Cisco Systems, Inc" },
  { macPrefix: "18:9A:9B", vendor: "Roku, Inc." },
  { macPrefix: "18:A9:05", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "18:B2:90", vendor: "Google, Inc." },
  { macPrefix: "18:B4:30", vendor: "D-Link Corporation" },
  { macPrefix: "18:B7:9E", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "18:B8:1F", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "18:C0:86", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "18:C5:8A", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "18:D6:C7", vendor: "Dell Inc." },
  { macPrefix: "18:D9:27", vendor: "LG Electronics" },
  { macPrefix: "18:DC:56", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "18:E2:CF", vendor: "Amazon Technologies Inc." },
  { macPrefix: "18:E7:F4", vendor: "ZTE Corporation" },
  { macPrefix: "18:E8:29", vendor: "Belkin International Inc." },
  { macPrefix: "18:EE:69", vendor: "Netgear, Inc." },
  { macPrefix: "18:F1:45", vendor: "Microsoft Corporation" },
  { macPrefix: "18:F4:6A", vendor: "HP Inc." },
  { macPrefix: "18:F6:43", vendor: "Espressif Inc." },
  { macPrefix: "18:F7:9A", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "1C:06:F3", vendor: "Apple, Inc." },
  { macPrefix: "1C:0B:9B", vendor: "Intel Corporate" },
  { macPrefix: "1C:0E:8C", vendor: "Texas Instruments" },
  { macPrefix: "1C:17:D3", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "1C:1B:0D", vendor: "Cisco Systems, Inc" },
  { macPrefix: "1C:1D:86", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "1C:1E:1C", vendor: "Belkin International Inc." },
  { macPrefix: "1C:23:2C", vendor: "HTC Corporation" },
  { macPrefix: "1C:26:6B", vendor: "Roku, Inc." },
  { macPrefix: "1C:29:3C", vendor: "Google, Inc." },
  { macPrefix: "1C:2E:84", vendor: "D-Link Corporation" },
  { macPrefix: "1C:33:77", vendor: "LG Electronics" },
  { macPrefix: "1C:33:92", vendor: "Microsoft Corporation" },
  { macPrefix: "1C:34:DA", vendor: "HP Inc." },
  { macPrefix: "1C:39:47", vendor: "Sony Ericsson Mobile Communications" },
  { macPrefix: "1C:3A:DE", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "1C:3B:F3", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "1C:44:44", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "1C:49:7B", vendor: "Netgear, Inc." },
  { macPrefix: "1C:4A:A8", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "1C:4B:D6", vendor: "IBM Corp" },
  { macPrefix: "1C:4D:70", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "1C:51:B5", vendor: "Buffalo Inc." },
  { macPrefix: "1C:5A:3B", vendor: "Dell Inc." },
  { macPrefix: "1C:5C:55", vendor: "ZTE Corporation" },
  { macPrefix: "1C:5C:F2", vendor: "Amazon Technologies Inc." },
  { macPrefix: "1C:5F:2B", vendor: "Espressif Inc." },
  { macPrefix: "1C:61:B4", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "1C:66:AA", vendor: "D-Link Corporation" },
  { macPrefix: "1C:69:7A", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "1C:6B:CA", vendor: "HTC Corporation" },
  { macPrefix: "1C:72:5A", vendor: "Intel Corporate" },
  { macPrefix: "1C:77:9C", vendor: "Roku, Inc." },
  { macPrefix: "1C:7B:23", vendor: "LG Electronics" },
  { macPrefix: "1C:7E:C5", vendor: "Google, Inc." },
  { macPrefix: "1C:83:41", vendor: "Cisco Systems, Inc" },
  { macPrefix: "1C:87:2C", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "1C:8B:4D", vendor: "Nokia Corporation" },
  { macPrefix: "1C:8E:5C", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "1C:91:9E", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "1C:93:5C", vendor: "Microsoft Corporation" },
  { macPrefix: "1C:98:EC", vendor: "Dell Inc." },
  { macPrefix: "1C:9D:72", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "1C:A0:54", vendor: "Apple, Inc." },
  { macPrefix: "1C:A1:7C", vendor: "Belkin International Inc." },
  { macPrefix: "1C:A5:32", vendor: "Netgear, Inc." },
  { macPrefix: "1C:AA:07", vendor: "HP Inc." },
  { macPrefix: "1C:AE:CB", vendor: "Amazon Technologies Inc." },
  { macPrefix: "1C:B0:44", vendor: "Texas Instruments" },
  { macPrefix: "1C:B1:7F", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "1C:B5:7C", vendor: "Espressif Inc." },
  { macPrefix: "1C:B7:2C", vendor: "Google, Inc." },
  { macPrefix: "1C:B9:C4", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "1C:BA:8C", vendor: "Roku, Inc." },
  { macPrefix: "1C:BD:B9", vendor: "Intel Corporate" },
  { macPrefix: "1C:C1:DE", vendor: "Microsoft Corporation" },
  { macPrefix: "1C:C2:28", vendor: "D-Link Corporation" },
  { macPrefix: "1C:C6:3C", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "1C:C9:2D", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "1C:CD:E5", vendor: "Dell Inc." },
  { macPrefix: "1C:D2:6F", vendor: "LG Electronics" },
  { macPrefix: "1C:D5:C3", vendor: "ZTE Corporation" },
  { macPrefix: "1C:D6:9A", vendor: "IBM Corp" },
  { macPrefix: "1C:D7:3B", vendor: "HTC Corporation" },
  { macPrefix: "1C:DB:96", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "1C:DD:EA", vendor: "Belkin International Inc." },
  { macPrefix: "1C:DE:1B", vendor: "Netgear, Inc." },
  { macPrefix: "1C:E2:5C", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "1C:E6:2B", vendor: "Sony Corporation" },
  { macPrefix: "1C:E8:5D", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "1C:EC:EB", vendor: "Roku, Inc." },
  { macPrefix: "1C:EE:54", vendor: "Apple, Inc." },
  { macPrefix: "1C:F0:5E", vendor: "Amazon Technologies Inc." },
  { macPrefix: "1C:F2:9A", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "1C:F4:CA", vendor: "Buffalo Inc." },
  { macPrefix: "1C:F5:E5", vendor: "HP Inc." },
  { macPrefix: "1C:F9:2E", vendor: "LG Electronics" },
  { macPrefix: "1C:FC:BB", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:02:AF", vendor: "Netgear, Inc." },
  { macPrefix: "20:04:0F", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:07:4C", vendor: "Roku, Inc." },
  { macPrefix: "20:0B:48", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:0C:C8", vendor: "Google, Inc." },
  { macPrefix: "20:0D:B0", vendor: "Intel Corporate" },
  { macPrefix: "20:0E:9C", vendor: "Microsoft Corporation" },
  { macPrefix: "20:0F:8F", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:10:7A", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:15:7C", vendor: "D-Link Corporation" },
  { macPrefix: "20:16:66", vendor: "Espressif Inc." },
  { macPrefix: "20:17:FA", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:1A:06", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:1B:2E", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:1C:6B", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:1E:88", vendor: "Dell Inc." },
  { macPrefix: "20:1F:3B", vendor: "Apple, Inc." },
  { macPrefix: "20:1F:CD", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:22:5C", vendor: "HTC Corporation" },
  { macPrefix: "20:23:3C", vendor: "Texas Instruments" },
  { macPrefix: "20:24:92", vendor: "HP Inc." },
  { macPrefix: "20:27:E1", vendor: "LG Electronics" },
  { macPrefix: "20:28:5A", vendor: "Buffalo Inc." },
  { macPrefix: "20:29:4E", vendor: "Belkin International Inc." },
  { macPrefix: "20:2B:0F", vendor: "Roku, Inc." },
  { macPrefix: "20:2B:46", vendor: "IBM Corp" },
  { macPrefix: "20:2C:D7", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:2E:8E", vendor: "Netgear, Inc." },
  { macPrefix: "20:2F:9B", vendor: "ZTE Corporation" },
  { macPrefix: "20:30:6C", vendor: "Microsoft Corporation" },
  { macPrefix: "20:32:33", vendor: "Intel Corporate" },
  { macPrefix: "20:33:45", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:35:64", vendor: "D-Link Corporation" },
  { macPrefix: "20:36:5B", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:37:06", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:37:8B", vendor: "Google, Inc." },
  { macPrefix: "20:39:56", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:3A:07", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:3B:03", vendor: "Dell Inc." },
  { macPrefix: "20:3C:AE", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:3D:5F", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:3E:3F", vendor: "HP Inc." },
  { macPrefix: "20:3F:4E", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:40:59", vendor: "Apple, Inc." },
  { macPrefix: "20:41:53", vendor: "LG Electronics" },
  { macPrefix: "20:42:89", vendor: "Roku, Inc." },
  { macPrefix: "20:44:65", vendor: "Belkin International Inc." },
  { macPrefix: "20:45:76", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:47:47", vendor: "Netgear, Inc." },
  { macPrefix: "20:48:5E", vendor: "Espressif Inc." },
  { macPrefix: "20:4A:9E", vendor: "Sony Corporation" },
  { macPrefix: "20:4C:03", vendor: "HTC Corporation" },
  { macPrefix: "20:4C:9E", vendor: "Microsoft Corporation" },
  { macPrefix: "20:4E:7F", vendor: "Buffalo Inc." },
  { macPrefix: "20:4F:4E", vendor: "Texas Instruments" },
  { macPrefix: "20:50:71", vendor: "IBM Corp" },
  { macPrefix: "20:51:FB", vendor: "D-Link Corporation" },
  { macPrefix: "20:52:33", vendor: "Google, Inc." },
  { macPrefix: "20:54:76", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:55:46", vendor: "Intel Corporate" },
  { macPrefix: "20:56:EA", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:58:69", vendor: "ZTE Corporation" },
  { macPrefix: "20:5A:3B", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:5C:37", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:5D:47", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:5E:9F", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:60:79", vendor: "Dell Inc." },
  { macPrefix: "20:62:79", vendor: "Roku, Inc." },
  { macPrefix: "20:64:32", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:64:8A", vendor: "Apple, Inc." },
  { macPrefix: "20:67:7C", vendor: "Netgear, Inc." },
  { macPrefix: "20:68:9C", vendor: "Belkin International Inc." },
  { macPrefix: "20:69:88", vendor: "HP Inc." },
  { macPrefix: "20:6A:4F", vendor: "LG Electronics" },
  { macPrefix: "20:6B:6F", vendor: "Espressif Inc." },
  { macPrefix: "20:6C:8A", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:6F:0D", vendor: "Microsoft Corporation" },
  { macPrefix: "20:6F:EC", vendor: "Nokia Corporation" },
  { macPrefix: "20:70:6F", vendor: "Sony Corporation" },
  { macPrefix: "20:71:2C", vendor: "D-Link Corporation" },
  { macPrefix: "20:72:4D", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:73:55", vendor: "AMD" },
  { macPrefix: "20:74:CF", vendor: "IBM Corp" },
  { macPrefix: "20:76:8F", vendor: "Google, Inc." },
  { macPrefix: "20:77:DE", vendor: "Texas Instruments" },
  { macPrefix: "20:78:26", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:78:56", vendor: "Intel Corporate" },
  { macPrefix: "20:79:18", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:7A:4E", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:7C:8F", vendor: "HTC Corporation" },
  { macPrefix: "20:7D:6A", vendor: "Buffalo Inc." },
  { macPrefix: "20:7E:3E", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:81:F9", vendor: "Dell Inc." },
  { macPrefix: "20:82:C0", vendor: "ZTE Corporation" },
  { macPrefix: "20:83:56", vendor: "Roku, Inc." },
  { macPrefix: "20:84:2C", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:86:3B", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "20:87:56", vendor: "Microsoft Corporation" },
  { macPrefix: "20:88:0F", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:89:84", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:8A:07", vendor: "Netgear, Inc." },
  { macPrefix: "20:8B:37", vendor: "Belkin International Inc." },
  { macPrefix: "20:8C:8D", vendor: "Sony Corporation" },
  { macPrefix: "20:8D:5C", vendor: "LG Electronics" },
  { macPrefix: "20:8E:79", vendor: "Apple, Inc." },
  { macPrefix: "20:8F:69", vendor: "HP Inc." },
  { macPrefix: "20:90:6F", vendor: "Texas Instruments" },
  { macPrefix: "20:91:48", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:91:8B", vendor: "Espressif Inc." },
  { macPrefix: "20:92:5C", vendor: "Intel Corporate" },
  { macPrefix: "20:93:42", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:94:6B", vendor: "D-Link Corporation" },
  { macPrefix: "20:96:8A", vendor: "ZTE Corporation" },
  { macPrefix: "20:97:14", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:97:74", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:98:6D", vendor: "Roku, Inc." },
  { macPrefix: "20:98:E6", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:99:94", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:9A:3F", vendor: "IBM Corp" },
  { macPrefix: "20:9B:7A", vendor: "Buffalo Inc." },
  { macPrefix: "20:9C:3B", vendor: "Google, Inc." },
  { macPrefix: "20:9D:0E", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:9E:49", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:9F:6D", vendor: "Dell Inc." },
  { macPrefix: "20:A0:15", vendor: "Microsoft Corporation" },
  { macPrefix: "20:A1:2E", vendor: "Netgear, Inc." },
  { macPrefix: "20:A2:38", vendor: "LG Electronics" },
  { macPrefix: "20:A3:5E", vendor: "Belkin International Inc." },
  { macPrefix: "20:A4:0B", vendor: "HP Inc." },
  { macPrefix: "20:A5:62", vendor: "HTC Corporation" },
  { macPrefix: "20:A6:0F", vendor: "Texas Instruments" },
  { macPrefix: "20:A6:7D", vendor: "Apple, Inc." },
  { macPrefix: "20:A7:17", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:A8:13", vendor: "Intel Corporate" },
  { macPrefix: "20:A9:7C", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:AA:4B", vendor: "D-Link Corporation" },
  { macPrefix: "20:AB:37", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:AB:8E", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:AC:7F", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "20:AD:7C", vendor: "Sony Corporation" },
  { macPrefix: "20:AE:46", vendor: "Roku, Inc." },
  { macPrefix: "20:AE:8B", vendor: "Espressif Inc." },
  { macPrefix: "20:B0:01", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:B0:F7", vendor: "Google, Inc." },
  { macPrefix: "20:B1:9C", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:B2:6D", vendor: "ZTE Corporation" },
  { macPrefix: "20:B3:14", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:B3:99", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:B4:43", vendor: "Buffalo Inc." },
  { macPrefix: "20:B5:5A", vendor: "Netgear, Inc." },
  { macPrefix: "20:B6:F0", vendor: "IBM Corp" },
  { macPrefix: "20:B7:3F", vendor: "Dell Inc." },
  { macPrefix: "20:B8:3C", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:B9:5F", vendor: "LG Electronics" },
  { macPrefix: "20:BA:3A", vendor: "HP Inc." },
  { macPrefix: "20:BA:E5", vendor: "Belkin International Inc." },
  { macPrefix: "20:BB:5C", vendor: "Microsoft Corporation" },
  { macPrefix: "20:BB:C0", vendor: "Texas Instruments" },
  { macPrefix: "20:BC:47", vendor: "D-Link Corporation" },
  { macPrefix: "20:BC:E4", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:BD:0A", vendor: "Intel Corporate" },
  { macPrefix: "20:BD:5E", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:BE:CD", vendor: "HTC Corporation" },
  { macPrefix: "20:BF:09", vendor: "Roku, Inc." },
  { macPrefix: "20:BF:DB", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:C0:47", vendor: "Apple, Inc." },
  { macPrefix: "20:C0:9B", vendor: "Google, Inc." },
  { macPrefix: "20:C1:9D", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:C2:3F", vendor: "Espressif Inc." },
  { macPrefix: "20:C3:5F", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:C4:39", vendor: "ZTE Corporation" },
  { macPrefix: "20:C4:BB", vendor: "Netgear, Inc." },
  { macPrefix: "20:C5:2C", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:C6:EB", vendor: "Sony Corporation" },
  { macPrefix: "20:C7:0F", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:C7:4C", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:C8:32", vendor: "Dell Inc." },
  { macPrefix: "20:C8:4B", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:C9:1F", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "20:C9:5D", vendor: "Buffalo Inc." },
  { macPrefix: "20:C9:9A", vendor: "LG Electronics" },
  { macPrefix: "20:C9:D0", vendor: "IBM Corp" },
  { macPrefix: "20:CA:3B", vendor: "HP Inc." },
  { macPrefix: "20:CA:4B", vendor: "Belkin International Inc." },
  { macPrefix: "20:CB:0E", vendor: "Microsoft Corporation" },
  { macPrefix: "20:CB:42", vendor: "Texas Instruments" },
  { macPrefix: "20:CC:5F", vendor: "D-Link Corporation" },
  { macPrefix: "20:CC:B6", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:CD:39", vendor: "Intel Corporate" },
  { macPrefix: "20:CD:AC", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:CE:8A", vendor: "HTC Corporation" },
  { macPrefix: "20:CE:C4", vendor: "Google, Inc." },
  { macPrefix: "20:CF:30", vendor: "Roku, Inc." },
  { macPrefix: "20:CF:4C", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:D0:6B", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:D0:84", vendor: "Apple, Inc." },
  { macPrefix: "20:D1:39", vendor: "Espressif Inc." },
  { macPrefix: "20:D1:9D", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:D2:3F", vendor: "ZTE Corporation" },
  { macPrefix: "20:D2:73", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:D3:1F", vendor: "Netgear, Inc." },
  { macPrefix: "20:D4:6B", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:D4:8E", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:D5:2F", vendor: "Dell Inc." },
  { macPrefix: "20:D5:4C", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:D6:5A", vendor: "Sony Corporation" },
  { macPrefix: "20:D6:87", vendor: "LG Electronics" },
  { macPrefix: "20:D7:3A", vendor: "HP Inc." },
  { macPrefix: "20:D7:5B", vendor: "Buffalo Inc." },
  { macPrefix: "20:D7:C4", vendor: "Belkin International Inc." },
  { macPrefix: "20:D8:1E", vendor: "IBM Corp" },
  { macPrefix: "20:D8:6B", vendor: "Microsoft Corporation" },
  { macPrefix: "20:D9:3F", vendor: "Texas Instruments" },
  { macPrefix: "20:D9:42", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:DA:22", vendor: "D-Link Corporation" },
  { macPrefix: "20:DA:8C", vendor: "Intel Corporate" },
  { macPrefix: "20:DB:3A", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:DB:AB", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "20:DC:1E", vendor: "Google, Inc." },
  { macPrefix: "20:DC:64", vendor: "Roku, Inc." },
  { macPrefix: "20:DD:1A", vendor: "HTC Corporation" },
  { macPrefix: "20:DD:5F", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:DE:8B", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:DE:C7", vendor: "Apple, Inc." },
  { macPrefix: "20:DF:3F", vendor: "Espressif Inc." },
  { macPrefix: "20:DF:9E", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:E0:5F", vendor: "ZTE Corporation" },
  { macPrefix: "20:E0:84", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:E1:3F", vendor: "Netgear, Inc." },
  { macPrefix: "20:E1:8B", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:E1:DD", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:E2:19", vendor: "Dell Inc." },
  { macPrefix: "20:E2:4C", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:E2:8F", vendor: "LG Electronics" },
  { macPrefix: "20:E3:0A", vendor: "Sony Corporation" },
  { macPrefix: "20:E3:4B", vendor: "HP Inc." },
  { macPrefix: "20:E3:9B", vendor: "Buffalo Inc." },
  { macPrefix: "20:E4:08", vendor: "Belkin International Inc." },
  { macPrefix: "20:E4:5B", vendor: "IBM Corp" },
  { macPrefix: "20:E4:8D", vendor: "Microsoft Corporation" },
  { macPrefix: "20:E5:0B", vendor: "Texas Instruments" },
  { macPrefix: "20:E5:2C", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:E5:5A", vendor: "D-Link Corporation" },
  { macPrefix: "20:E5:9A", vendor: "Intel Corporate" },
  { macPrefix: "20:E6:3D", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:E6:82", vendor: "Google, Inc." },
  { macPrefix: "20:E7:0C", vendor: "Roku, Inc." },
  { macPrefix: "20:E7:4A", vendor: "HTC Corporation" },
  { macPrefix: "20:E7:9F", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:E8:0C", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:E8:4D", vendor: "Apple, Inc." },
  { macPrefix: "20:E8:9E", vendor: "Espressif Inc." },
  { macPrefix: "20:E9:06", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:E9:6B", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:E9:8C", vendor: "ZTE Corporation" },
  { macPrefix: "20:EA:3B", vendor: "Netgear, Inc." },
  { macPrefix: "20:EA:7C", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:EB:0D", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:EB:4F", vendor: "Dell Inc." },
  { macPrefix: "20:EB:93", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:EC:1F", vendor: "LG Electronics" },
  { macPrefix: "20:EC:82", vendor: "Sony Corporation" },
  { macPrefix: "20:ED:0A", vendor: "HP Inc." },
  { macPrefix: "20:ED:5B", vendor: "Buffalo Inc." },
  { macPrefix: "20:EE:1C", vendor: "Belkin International Inc." },
  { macPrefix: "20:EE:6B", vendor: "IBM Corp" },
  { macPrefix: "20:EE:8F", vendor: "Microsoft Corporation" },
  { macPrefix: "20:EF:1B", vendor: "Texas Instruments" },
  { macPrefix: "20:EF:4C", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:F0:0B", vendor: "D-Link Corporation" },
  { macPrefix: "20:F0:5A", vendor: "Intel Corporate" },
  { macPrefix: "20:F0:7B", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:F0:A0", vendor: "Google, Inc." },
  { macPrefix: "20:F1:0C", vendor: "Roku, Inc." },
  { macPrefix: "20:F1:3B", vendor: "HTC Corporation" },
  { macPrefix: "20:F1:7E", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:F2:0B", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:F2:4C", vendor: "Apple, Inc." },
  { macPrefix: "20:F2:8A", vendor: "Espressif Inc." },
  { macPrefix: "20:F3:0D", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:F3:5B", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:F3:8C", vendor: "ZTE Corporation" },
  { macPrefix: "20:F4:0B", vendor: "Netgear, Inc." },
  { macPrefix: "20:F4:5C", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:F4:7D", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:F5:0E", vendor: "Dell Inc." },
  { macPrefix: "20:F5:4F", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:F5:93", vendor: "LG Electronics" },
  { macPrefix: "20:F6:0A", vendor: "Sony Corporation" },
  { macPrefix: "20:F6:4B", vendor: "HP Inc." },
  { macPrefix: "20:F6:9B", vendor: "Buffalo Inc." },
  { macPrefix: "20:F7:1C", vendor: "Belkin International Inc." },
  { macPrefix: "20:F7:5B", vendor: "IBM Corp" },
  { macPrefix: "20:F7:8F", vendor: "Microsoft Corporation" },
  { macPrefix: "20:F8:0B", vendor: "Texas Instruments" },
  { macPrefix: "20:F8:4C", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "20:F9:0B", vendor: "D-Link Corporation" },
  { macPrefix: "20:F9:4A", vendor: "Intel Corporate" },
  { macPrefix: "20:F9:6B", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "20:FA:0B", vendor: "Google, Inc." },
  { macPrefix: "20:FA:3C", vendor: "Roku, Inc." },
  { macPrefix: "20:FA:7B", vendor: "HTC Corporation" },
  { macPrefix: "20:FB:0C", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "20:FB:4B", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "20:FB:8A", vendor: "Apple, Inc." },
  { macPrefix: "20:FC:0D", vendor: "Espressif Inc." },
  { macPrefix: "20:FC:5B", vendor: "Amazon Technologies Inc." },
  { macPrefix: "20:FC:8C", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "20:FD:0B", vendor: "ZTE Corporation" },
  { macPrefix: "20:FD:4C", vendor: "Netgear, Inc." },
  { macPrefix: "20:FD:7D", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "20:FE:0E", vendor: "Cisco Systems, Inc" },
  { macPrefix: "20:FE:4F", vendor: "Dell Inc." },
  { macPrefix: "20:FE:93", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "20:FF:0A", vendor: "LG Electronics" },
  { macPrefix: "20:FF:4B", vendor: "Sony Corporation" },
  { macPrefix: "20:FF:9B", vendor: "HP Inc." },
  { macPrefix: "24:00:BA", vendor: "Cisco Systems, Inc" },
  { macPrefix: "24:01:C7", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "24:05:0F", vendor: "Apple, Inc." },
  { macPrefix: "24:05:88", vendor: "Intel Corporate" },
  { macPrefix: "24:06:6A", vendor: "HTC Corporation" },
  { macPrefix: "24:09:3C", vendor: "Dell Inc." },
  { macPrefix: "24:0A:64", vendor: "Microsoft Corporation" },
  { macPrefix: "24:0A:C4", vendor: "LG Electronics" },
  { macPrefix: "24:0B:0A", vendor: "Google, Inc." },
  { macPrefix: "24:0B:2C", vendor: "Amazon Technologies Inc." },
  { macPrefix: "24:0D:65", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "24:0F:3E", vendor: "Belkin International Inc." },
  { macPrefix: "24:0F:5A", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "24:10:46", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "24:11:25", vendor: "Netgear, Inc." },
  { macPrefix: "24:12:5B", vendor: "Roku, Inc." },
  { macPrefix: "24:12:97", vendor: "D-Link Corporation" },
  { macPrefix: "24:13:5C", vendor: "Sony Corporation" },
  { macPrefix: "24:13:C7", vendor: "Espressif Inc." },
  { macPrefix: "24:13:D6", vendor: "Motorola Mobility, Inc." },
  { macPrefix: "24:14:5E", vendor: "Buffalo Inc." },
  { macPrefix: "24:15:1C", vendor: "Texas Instruments" },
  { macPrefix: "24:15:60", vendor: "IBM Corp" },
  { macPrefix: "24:15:C5", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "24:16:3E", vendor: "HP Inc." },
  { macPrefix: "24:16:6D", vendor: "Nokia Corporation" },
  { macPrefix: "24:17:3C", vendor: "ZTE Corporation" },
  { macPrefix: "24:17:9C", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "24:17:C5", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "24:18:1D", vendor: "AMD" },
  { macPrefix: "24:18:7D", vendor: "Intel Corporate" },
  { macPrefix: "24:19:2D", vendor: "Samsung Electronics Co., Ltd" },
  { macPrefix: "24:19:7B", vendor: "Dell Inc." },
  { macPrefix: "24:1A:3C", vendor: "Apple, Inc." },
  { macPrefix: "24:1A:8F", vendor: "HTC Corporation" },
  { macPrefix: "24:1B:0D", vendor: "Microsoft Corporation" },
  { macPrefix: "24:1B:5F", vendor: "LG Electronics" },
  { macPrefix: "24:1B:9B", vendor: "Google, Inc." },
  { macPrefix: "24:1C:0C", vendor: "Amazon Technologies Inc." },
  { macPrefix: "24:1C:4F", vendor: "ASUSTek COMPUTER INC." },
  { macPrefix: "24:1C:8A", vendor: "Belkin International Inc." },
  { macPrefix: "24:1D:0D", vendor: "Huawei Technologies Co., Ltd" },
  { macPrefix: "24:1D:5B", vendor: "TP-Link Technologies Co., Ltd." },
  { macPrefix: "24:1D:8C", vendor: "Netgear, Inc." },
  { macPrefix: "24:1E:0B", vendor: "Roku, Inc." },
  { macPrefix: "24:1E:4C", vendor: "D-Link Corporation" },
  { macPrefix: "24:1E:7D", vendor: "Sony Corporation" },
  { macPrefix: "24:1F:0E", vendor: "Espressif Inc." },
  { macPrefix: "24:1F:4F", vendor: "Buffalo Inc." },
  { macPrefix: "24:1F:93", vendor: "Texas Instruments" },
  { macPrefix: "24:20:0A", vendor: "IBM Corp" },
  { macPrefix: "24:20:4B", vendor: "Nintendo Co., Ltd." },
  { macPrefix: "24:20:9B", vendor: "HP Inc." },
  { macPrefix: "24:21:0C", vendor: "ZTE Corporation" },
  { macPrefix: "24:21:5B", vendor: "Raspberry Pi Foundation" },
  { macPrefix: "24:21:8C", vendor: "Xiaomi Communications Co Ltd" },
  { macPrefix: "FF:FF:FF", vendor: "Broadcast" },
];

function normalizeMac(mac: string): string {
  const clean = mac.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (clean.length < 6) return "";
  return clean.slice(0, 2) + ":" + clean.slice(2, 4) + ":" + clean.slice(4, 6);
}

function lookupVendor(mac: string): string | null {
  const prefix = normalizeMac(mac);
  if (!prefix) return null;
  const entry = OUI_DATABASE.find(e => e.macPrefix === prefix);
  return entry?.vendor ?? null;
}

export default function MacAddressLookupTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [input, setInput] = useState("");
  const [results, setResults] = useState<{ mac: string; vendor: string | null; prefix: string }[]>([]);

  function search() {
    const macs = input.trim().split(/[\\n,; ]+/).filter(Boolean);
    setResults(macs.map(mac => {
      const prefix = normalizeMac(mac);
      return { mac, vendor: prefix ? lookupVendor(mac) : null, prefix: prefix || "-" };
    }));
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>MAC 地址</span>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="00:1A:11:00:00:00, 08:00:27..." />
        </label>
        <button type="button" className="button--primary" onClick={search}>查询</button>
      </div>
      {results.length > 0 ? (
        <div className="tool-table">
          <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "1fr 1fr 2fr" }}>
            <span>MAC 地址</span><span>OUI 前缀</span><span>厂商</span>
          </div>
          {results.map((r, i) => (
            <div key={i} className="tool-table__row" style={{ gridTemplateColumns: "1fr 1fr 2fr" }}>
              <span className="mono-output">{r.mac}</span>
              <span className="mono-output">{r.prefix}</span>
              <span>{r.vendor ?? <span className="tool-error">未知厂商</span>}</span>
            </div>
          ))}
        </div>
      ) : <p className="tool-note">输入 MAC 地址查询 OUI 厂商信息，支持冒号、连字符或无分隔符格式。</p>}
    </section>
  );
}
`;
}

function httpRequestInspectorApp() {
  return `"use client";

import { useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface RedirectStep {
  url: string;
  status: number;
  headers: Record<string, string>;
}

interface RequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyTruncated: boolean;
  timing: number;
  redirectChain: RedirectStep[];
}

export default function HttpRequestInspectorTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState("Accept: application/json");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<RequestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!url.trim()) { setError("请输入 URL"); return; }
    setBusy(true); setError(""); setResult(null);
    const start = performance.now();
    try {
      const parsedHeaders: Record<string, string> = {};
      headers.split("\\n").forEach(line => {
        const idx = line.indexOf(":");
        if (idx > 0) parsedHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      });
      const res = await fetch(url, {
        method,
        headers: parsedHeaders,
        body: method !== "GET" && method !== "HEAD" && body ? body : undefined,
        redirect: "manual",
      });
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const text = await res.text();
      setResult({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: text.slice(0, 50000),
        bodyTruncated: text.length > 50000,
        timing: performance.now() - start,
        redirectChain: [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally { setBusy(false); }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>方法</span>
          <select value={method} onChange={e => setMethod(e.target.value)}>
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="tool-field" style={{ flex: 1 }}>
          <span>URL</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
        </label>
        <button type="button" className="button--primary" onClick={send} disabled={busy}>{busy ? "请求中..." : "发送"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>请求 Headers</span><textarea className="code-input" value={headers} onChange={e => setHeaders(e.target.value)} rows={6} /></label>
          {method !== "GET" && method !== "HEAD" ? (
            <label className="tool-field"><span>请求 Body</span><textarea className="code-input" value={body} onChange={e => setBody(e.target.value)} rows={6} /></label>
          ) : null}
        </div>
        <div className="workspace workspace--stack">
          {result ? (
            <>
              <div className="detail-grid">
                <article className="detail-card"><h3>状态</h3><p>{result.status} {result.statusText}</p></article>
                <article className="detail-card"><h3>耗时</h3><p>{result.timing.toFixed(0)}ms</p></article>
                <article className="detail-card"><h3>响应体</h3><p>{result.body.length} 字符{result.bodyTruncated ? " (截断)" : ""}</p></article>
              </div>
              <label className="tool-field"><span>响应 Headers</span>
                <div className="code-input" style={{ padding: "0.5rem", fontSize: "0.75rem", maxHeight: 200, overflow: "auto" }}>
                  {Object.entries(result.headers).map(([k, v]) => <div key={k} className="mono-output">{k}: {v}</div>)}
                </div>
              </label>
              <label className="tool-field"><span>响应 Body (前 50000 字符)</span>
                <textarea className="code-input" value={result.body} readOnly rows={8} />
              </label>
            </>
          ) : <p className="tool-note">发送 HTTP 请求并查看完整的响应详情。</p>}
        </div>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
`;
}

function httpRedirectTrackerApp() {
  return `"use client";

import { useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface RedirectHop {
  url: string;
  status: number;
  statusText: string;
  location: string | null;
  headers: [string, string][];
}

export default function HttpRedirectTrackerTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [url, setUrl] = useState("https://httpbin.org/redirect/5");
  const [hops, setHops] = useState<RedirectHop[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function trace() {
    if (!url.trim()) { setError("请输入 URL"); return; }
    setBusy(true); setError(""); setHops([]);
    const chain: RedirectHop[] = [];
    let currentUrl = url;
    try {
      while (chain.length < 20) {
        const res = await fetch(currentUrl, { redirect: "manual", signal: AbortSignal.timeout(10000) });
        const location = res.headers.get("location");
        const headers: [string, string][] = [];
        res.headers.forEach((v, k) => { headers.push([k, v]); });
        chain.push({ url: currentUrl, status: res.status, statusText: res.statusText, location, headers });
        if (!location || res.status < 300 || res.status >= 400) break;
        try { currentUrl = new URL(location, currentUrl).href; } catch { break; }
      }
      setHops(chain);
    } catch (e) {
      setError(e instanceof Error ? e.message : "追踪失败");
    } finally { setBusy(false); }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field" style={{ flex: 1 }}>
          <span>URL</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
        </label>
        <button type="button" className="button--primary" onClick={trace} disabled={busy}>{busy ? "追踪中..." : "追踪"}</button>
      </div>
      {hops.length > 0 ? (
        <div className="workspace workspace--stack">
          <div className="detail-grid">
            <article className="detail-card"><h3>跳转次数</h3><p>{hops.length}</p></article>
            <article className="detail-card"><h3>最终状态</h3><p>{hops[hops.length - 1].status}</p></article>
            <article className="detail-card"><h3>最终 URL</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{hops[hops.length - 1].url}</p></article>
          </div>
          {hops.map((hop, i) => (
            <div key={i} className="detail-card">
              <h3>#{i + 1} {hop.status} {hop.statusText}</h3>
              <p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{hop.url}</p>
              {hop.location ? <p className="tool-note">Location: {hop.location}</p> : null}
            </div>
          ))}
        </div>
      ) : <p className="tool-note">输入 URL 追踪 HTTP 重定向链，最多追踪 20 跳。</p>}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
`;
}

function bandwidthCalculatorApp() {
  return `"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const UNITS = ["bit/s", "Kbit/s", "Mbit/s", "Gbit/s", "byte/s", "KB/s", "MB/s", "GB/s"];

function convertToBitsPerSecond(value: number, unit: string): number {
  const multipliers: Record<string, number> = {
    "bit/s": 1, "Kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9,
    "byte/s": 8, "KB/s": 8e3, "MB/s": 8e6, "GB/s": 8e9,
  };
  return value * (multipliers[unit] ?? 1);
}

function formatBits(bits: number): string {
  if (bits >= 1e9) return (bits / 1e9).toFixed(2) + " Gbit/s";
  if (bits >= 1e6) return (bits / 1e6).toFixed(2) + " Mbit/s";
  if (bits >= 1e3) return (bits / 1e3).toFixed(2) + " Kbit/s";
  return bits.toFixed(2) + " bit/s";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB";
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + " KB";
  return bytes.toFixed(2) + " B";
}

export default function BandwidthCalculatorTool({ manifest }: ToolAppProps) {
  const [bandwidth, setBandwidth] = useState(100);
  const [bwUnit, setBwUnit] = useState("Mbit/s");
  const [fileSize, setFileSize] = useState(500);
  const [fsUnit, setFsUnit] = useState("MB");

  const bwBits = useMemo(() => convertToBitsPerSecond(bandwidth, bwUnit), [bandwidth, bwUnit]);
  const fileBits = useMemo(() => {
    const mults: Record<string, number> = { B: 8, KB: 8e3, MB: 8e6, GB: 8e9, TB: 8e12 };
    return fileSize * (mults[fsUnit] ?? 8e6);
  }, [fileSize, fsUnit]);

  const transferTime = bwBits > 0 ? fileBits / bwBits : Infinity;
  const days = Math.floor(transferTime / 86400);
  const hours = Math.floor((transferTime % 86400) / 3600);
  const minutes = Math.floor((transferTime % 3600) / 60);
  const seconds = transferTime % 60;

  const timeStr = days > 0 ? \`\${days}d \${hours}h \${minutes}m \${seconds.toFixed(1)}s\` :
    hours > 0 ? \`\${hours}h \${minutes}m \${seconds.toFixed(1)}s\` :
    minutes > 0 ? \`\${minutes}m \${seconds.toFixed(1)}s\` :
    \`\${seconds.toFixed(2)}s\`;

  const maxBw = bwBits > 0 ? formatBits(bwBits) : "N/A";
  const perSecond = bwBits > 0 ? formatBytes(bwBits / 8) + "/s" : "N/A";

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络计算</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>带宽</span>
          <input type="number" value={bandwidth} onChange={e => setBandwidth(Number(e.target.value))} min={0} />
        </label>
        <select value={bwUnit} onChange={e => setBwUnit(e.target.value)}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <label className="tool-field tool-field--compact">
          <span>数据大小</span>
          <input type="number" value={fileSize} onChange={e => setFileSize(Number(e.target.value))} min={0} />
        </label>
        <select value={fsUnit} onChange={e => setFsUnit(e.target.value)}>
          {["B", "KB", "MB", "GB", "TB"].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>带宽</h3><p>{maxBw}</p></article>
        <article className="detail-card"><h3>吞吐量</h3><p>{perSecond}</p></article>
        <article className="detail-card"><h3>文件大小</h3><p>{formatBytes(fileBits / 8)}</p></article>
        <article className="detail-card"><h3>传输时间</h3><p>{timeStr}</p></article>
      </div>
      <p className="tool-note">理论值，实际传输时间受网络延迟、丢包和协议开销影响。</p>
    </section>
  );
}
`;
}

function ipv6SubnetCalculatorApp() {
  return `"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

function expandIPv6(addr: string): string {
  let clean = addr.trim();
  if (clean.startsWith("::")) clean = "0" + clean;
  if (clean.endsWith("::")) clean = clean + "0";
  const parts = clean.split(":");
  const expanded: string[] = [];
  let inserted = false;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") {
      if (!inserted) {
        const zeros = 8 - (parts.length - 1);
        for (let j = 0; j < zeros; j++) expanded.push("0000");
        inserted = true;
      }
    } else {
      expanded.push(parts[i].padStart(4, "0"));
    }
  }
  return expanded.join(":").toLowerCase();
}

function prefixToMask(bits: number): string {
  const mask = new Array(8).fill("0000");
  for (let i = 0; i < 8; i++) {
    const bitStart = i * 16;
    const bitEnd = Math.min(bitStart + 16, bits);
    const ones = Math.max(0, bitEnd - bitStart);
    if (ones > 0) {
      mask[i] = (0xFFFF << (16 - ones) & 0xFFFF).toString(16).padStart(4, "0");
    }
  }
  return mask.join(":");
}

export default function Ipv6SubnetCalculatorTool({ manifest }: ToolAppProps) {
  const [network, setNetwork] = useState("2001:db8::");
  const [prefix, setPrefix] = useState(32);

  const result = useMemo(() => {
    try {
      const expanded = expandIPv6(network);
      if (prefix < 0 || prefix > 128) return { error: "前缀长度应在 0-128 之间" };
      const mask = prefixToMask(prefix);
      const expandedMask = expandIPv6(mask);
      const netParts = expanded.split(":");
      const maskParts = expandedMask.split(":");
      const networkAddr = netParts.map((p, i) => {
        const np = parseInt(p, 16);
        const mp = parseInt(maskParts[i], 16);
        return (np & mp).toString(16).padStart(4, "0");
      }).join(":");
      const totalHosts = prefix >= 128 ? 1 : Math.pow(2, 128 - prefix);
      return {
        expanded,
        mask: expandedMask,
        networkAddr,
        totalHosts: totalHosts >= 1e12 ? \`\${(totalHosts / 1e12).toFixed(2)}T\` :
          totalHosts >= 1e9 ? \`\${(totalHosts / 1e9).toFixed(2)}B\` :
          totalHosts >= 1e6 ? \`\${(totalHosts / 1e6).toFixed(2)}M\` :
          totalHosts >= 1e3 ? \`\${(totalHosts / 1e3).toFixed(2)}K\` :
          String(totalHosts),
        prefix,
        error: null,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "计算失败" };
    }
  }, [network, prefix]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络计算</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>网络地址</span>
          <input value={network} onChange={e => setNetwork(e.target.value)} placeholder="2001:db8::" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>前缀长度</span>
          <input type="number" value={prefix} onChange={e => setPrefix(Math.min(128, Math.max(0, Number(e.target.value))))} min={0} max={128} style={{ width: 80 }} />
        </label>
      </div>
      {result.error ? <p className="tool-error">{result.error}</p> : (
        <div className="detail-grid">
          <article className="detail-card"><h3>展开地址</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{result.expanded}</p></article>
          <article className="detail-card"><h3>子网掩码</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{result.mask}</p></article>
          <article className="detail-card"><h3>网络地址</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{result.networkAddr}/{result.prefix}</p></article>
          <article className="detail-card"><h3>地址总数</h3><p>{result.totalHosts}</p></article>
        </div>
      )}
      <p className="tool-note">IPv6 计算器，支持缩写展开和任意前缀长度（0-128）。</p>
    </section>
  );
}
`;
}

function networkConnectionInfoApp() {
  return `"use client";

import { useEffect, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface NetInfo {
  connectionType: string | null;
  downlink: number | null;
  downlinkMax: number | null;
  rtt: number | null;
  saveData: boolean | null;
  effectiveType: string | null;
}

export default function NetworkConnectionInfoTool({ manifest }: ToolAppProps) {
  const [info, setInfo] = useState<NetInfo>({
    connectionType: null, downlink: null, downlinkMax: null,
    rtt: null, saveData: null, effectiveType: null,
  });

  function update() {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
      setInfo({
        connectionType: conn.type ?? null,
        downlink: conn.downlink ?? null,
        downlinkMax: conn.downlinkMax ?? null,
        rtt: conn.rtt ?? null,
        saveData: conn.saveData ?? null,
        effectiveType: conn.effectiveType ?? null,
      });
    }
  }

  useEffect(() => {
    update();
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    conn?.addEventListener("change", update);
    return () => conn?.removeEventListener("change", update);
  }, []);

  const bars = info.effectiveType === "4g" ? 4 : info.effectiveType === "3g" ? 3 : info.effectiveType === "2g" ? 2 : info.effectiveType === "slow-2g" ? 1 : 0;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络诊断</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>连接类型</h3><p>{info.connectionType ?? "N/A"}</p></article>
        <article className="detail-card"><h3>有效类型</h3><p>{info.effectiveType ?? "N/A"}{bars > 0 ? \` (\${"▮".repeat(bars)}\${"▯".repeat(4 - bars)})\` : ""}</p></article>
        <article className="detail-card"><h3>下行速度</h3><p>{info.downlink != null ? \`\${info.downlink} Mbps\` : "N/A"}</p></article>
        <article className="detail-card"><h3>最大下行</h3><p>{info.downlinkMax != null ? \`\${info.downlinkMax} Mbps\` : "N/A"}</p></article>
        <article className="detail-card"><h3>RTT</h3><p>{info.rtt != null ? \`\${info.rtt} ms\` : "N/A"}</p></article>
        <article className="detail-card"><h3>省流模式</h3><p>{info.saveData != null ? (info.saveData ? "开启" : "关闭") : "N/A"}</p></article>
      </div>
      <p className="tool-note">基于 Network Information API，部分浏览器可能不支持或返回有限数据。</p>
    </section>
  );
}
`;
}

// ================================================================
// Main generation
// ================================================================
async function main() {
  let created = 0;
  let skipped = 0;

  for (const tool of tools) {
    const toolDir = path.join(toolsDir, tool.id);
    try {
      await fs.access(toolDir);
      console.log(`  SKIP ${tool.id} (already exists)`);
      skipped++;
      continue;
    } catch { /* proceed */ }

    const manifest = `import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "${tool.id}",
  name: "${tool.name}",
  description: "${tool.description}",
  category: "${tool.category}",
  subCategory: "${tool.subCategory}",
  tags: [${tool.tags.map(t => `"${t}"`).join(", ")}],
  icon: "${tool.icon}",
  runtime: "${tool.runtime}",
  featured: false,
${tool.manifestExtra}
};

export default manifest;
`;

    const app = tool.app();

    const packageJson = {
      name: `@tool-platform/${tool.id}`,
      version: "0.1.0",
      private: true,
      type: "module",
      exports: {
        "./manifest": "./manifest.ts",
        "./app": "./app.tsx"
      },
      dependencies: {
        "@tool-platform/tool-browser-sdk": "workspace:*",
        "@tool-platform/tool-contracts": "workspace:*"
      },
      peerDependencies: {
        "react": "^19.0.0"
      }
    };

    const readme = `# ${tool.name}

${tool.description}

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | ${tool.category} |
| 子分类 | ${tool.subCategory} |
| 运行环境 | ${tool.runtime} |

## 目录结构

\`\`\`
${tool.id}/
├── manifest.ts        # 工具元声明
├── app.tsx             # 工具 UI 组件
├── package.json        # 包配置
└── README.md           # 本文档
\`\`\`
`;

    await fs.mkdir(toolDir, { recursive: true });
    await fs.writeFile(path.join(toolDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n", "utf8");
    await fs.writeFile(path.join(toolDir, "manifest.ts"), manifest, "utf8");
    await fs.writeFile(path.join(toolDir, "app.tsx"), app, "utf8");
    await fs.writeFile(path.join(toolDir, "README.md"), readme, "utf8");
    console.log(`  CREATE ${tool.id}`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
