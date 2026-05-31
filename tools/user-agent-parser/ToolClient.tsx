"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function matchFirst(input: string, patterns: Array<[string, RegExp]>) {
  for (const [label, pattern] of patterns) {
    const match = input.match(pattern);

    if (match) {
      return match[1] ? label + " " + match[1].replace(/_/g, ".") : label;
    }
  }

  return "未知";
}

function parseUserAgent(input: string) {
  return {
    browser: matchFirst(input, [
      ["Edge", /Edg\/([\d.]+)/],
      ["Chrome", /Chrome\/([\d.]+)/],
      ["Firefox", /Firefox\/([\d.]+)/],
      ["Safari", /Version\/([\d.]+).*Safari/]
    ]),
    os: matchFirst(input, [
      ["Windows", /Windows NT ([\d.]+)/],
      ["macOS", /Mac OS X ([\d_]+)/],
      ["iOS", /OS ([\d_]+) like Mac OS X/],
      ["Android", /Android ([\d.]+)/],
      ["Linux", /Linux/]
    ]),
    engine: matchFirst(input, [
      ["Blink", /Chrome\/[\d.]+/],
      ["Gecko", /Gecko\/[\d.]+/],
      ["WebKit", /AppleWebKit\/([\d.]+)/]
    ]),
    device: /Tablet|iPad/.test(input) ? "平板或 iPad" : /Mobile|iPhone|Android/.test(input) ? "移动端" : "桌面端或未知"
  };
}

export default function UserAgentParserTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
  const result = parseUserAgent(input);
  const labels: Record<keyof typeof result, string> = {
    browser: "浏览器",
    os: "操作系统",
    engine: "渲染引擎",
    device: "设备类型"
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">访问日志排查</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>UA 字符</h3>
          <p>{input.length}</p>
        </article>
        <article className="detail-card">
          <h3>是否移动端</h3>
          <p>{/Mobile|iPhone|Android/.test(input) ? "是" : "否"}</p>
        </article>
      </div>
      <label className="tool-field">
        <span>User-Agent</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        {Object.entries(result).map(([key, value]) => (
          <article key={key} className="detail-card">
            <h3>{labels[key as keyof typeof result]}</h3>
            <p>{value}</p>
          </article>
        ))}
      </div>
      <p className="tool-note">User-Agent 可以被伪造，适合日志排查和粗略分群；关键能力判断仍应使用特性检测或服务端真实指标。</p>
    </section>
  );
}
