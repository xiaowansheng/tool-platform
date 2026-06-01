"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function ipToNumber(ip: string) {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    throw new Error("请输入有效 IPv4 地址");
  }

  return parts.reduce((total, part) => (total << 8) + part, 0) >>> 0;
}

function numberToIp(value: number) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function parseCidr(input: string) {
  const [ip = "", prefixText = ""] = input.trim().split("/");
  const prefix = Number(prefixText);

  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error("CIDR 前缀必须在 0-32 之间");
  }

  const address = ipToNumber(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = address & mask;
  const broadcast = network | (~mask >>> 0);
  const total = 2 ** (32 - prefix);
  const usable = prefix >= 31 ? total : Math.max(0, total - 2);

  return {
    address: numberToIp(address),
    netmask: numberToIp(mask),
    network: numberToIp(network),
    broadcast: numberToIp(broadcast),
    firstHost: numberToIp(prefix >= 31 ? network : network + 1),
    lastHost: numberToIp(prefix >= 31 ? broadcast : broadcast - 1),
    total,
    usable
  };
}

export default function Ipv4CidrCalculatorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("192.168.1.24/24");

  let result: ReturnType<typeof parseCidr> | null = null;
  let error = "";

  try {
    result = parseCidr(input);
  } catch (parseError) {
    error = parseError instanceof Error ? parseError.message : "CIDR 解析失败";
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>CIDR</span>
        <input value={input} onChange={(event) => setInput(event.target.value)} />
      </label>
      {result ? (
        <div className="detail-grid">
          {Object.entries(result).map(([key, value]) => (
            <article key={key} className="detail-card">
              <h3>{key}</h3>
              <p>{value.toLocaleString()}</p>
            </article>
          ))}
        </div>
      ) : null}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
