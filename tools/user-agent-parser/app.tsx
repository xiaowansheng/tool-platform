"use client";

import { useEffect, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface UaBreakdown {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  engine: string;
  engineVersion: string;
  device: string;
  deviceBrand: string;
  isMobile: boolean;
  isBot: boolean;
  botName: string;
  webViewEnvironment: string;
}

// Robust Custom UA Parser
function parseUserAgentDetails(ua: string): UaBreakdown {
  const cleanUa = ua.trim();
  const lowerUa = cleanUa.toLowerCase();

  // 1. Bot / Crawler Detection
  let isBot = false;
  let botName = "";
  const bots = [
    { name: "Googlebot", regex: /googlebot/i },
    { name: "Bingbot", regex: /bingbot/i },
    { name: "Baiduspider", regex: /baiduspider/i },
    { name: "Yandex Bot", regex: /yandexbot/i },
    { name: "Applebot", regex: /applebot/i },
    { name: "DuckDuckBot", regex: /duckduckbot/i },
    { name: "AhrefsBot", regex: /ahrefsbot/i },
    { name: "Sogou Spider", regex: /sogou/i }
  ];

  for (const bot of bots) {
    if (bot.regex.test(lowerUa)) {
      isBot = true;
      botName = bot.name;
      break;
    }
  }

  // 2. OS and OS Version Detection
  let os = "未知操作系统";
  let osVersion = "";

  if (/windows nt/i.test(lowerUa)) {
    os = "Windows";
    const winMatch = cleanUa.match(/Windows NT ([\d.]+)/i);
    if (winMatch && winMatch[1]) {
      const ver = winMatch[1];
      if (ver === "10.0") {
        // Technically Windows 10 & 11 share NT 10.0, we label as 10/11
        osVersion = "10 / 11";
      } else if (ver === "6.3") osVersion = "8.1";
      else if (ver === "6.2") osVersion = "8";
      else if (ver === "6.1") osVersion = "7";
      else if (ver === "6.0") osVersion = "Vista";
      else if (ver === "5.1" || ver === "5.2") osVersion = "XP";
      else osVersion = ver;
    }
  } else if (/macintosh/i.test(lowerUa)) {
    os = "macOS";
    const macMatch = cleanUa.match(/Mac OS X ([\d._]+)/i);
    if (macMatch && macMatch[1]) {
      osVersion = macMatch[1].replace(/_/g, ".");
    }
  } else if (/iphone|ipad|ipod/i.test(lowerUa)) {
    os = /ipad/i.test(lowerUa) ? "iPadOS" : "iOS";
    const iosMatch = cleanUa.match(/OS ([\d._]+) like Mac OS X/i);
    if (iosMatch && iosMatch[1]) {
      osVersion = iosMatch[1].replace(/_/g, ".");
    }
  } else if (/android/i.test(lowerUa)) {
    os = "Android";
    const androidMatch = cleanUa.match(/Android ([\d.]+)/i);
    if (androidMatch && androidMatch[1]) {
      osVersion = androidMatch[1];
    }
  } else if (/linux/i.test(lowerUa)) {
    os = "Linux";
  }

  // 3. Browser & Version Detection
  let browser = "未知浏览器";
  let browserVersion = "";

  if (/edg\/([\d.]+)/i.test(lowerUa)) {
    browser = "Microsoft Edge";
    const match = cleanUa.match(/Edg\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/chrome\/([\d.]+)/i.test(lowerUa) && !/like chrome/i.test(lowerUa)) {
    browser = "Google Chrome";
    const match = cleanUa.match(/Chrome\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/firefox\/([\d.]+)/i.test(lowerUa)) {
    browser = "Mozilla Firefox";
    const match = cleanUa.match(/Firefox\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/safari\/([\d.]+)/i.test(lowerUa) && !/chrome/i.test(lowerUa)) {
    browser = "Apple Safari";
    const match = cleanUa.match(/Version\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/opr\/([\d.]+)/i.test(lowerUa) || /opera/i.test(lowerUa)) {
    browser = "Opera";
    const match = cleanUa.match(/(?:OPR|Version)\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  }

  // 4. Engine & Version
  let engine = "未知引擎";
  let engineVersion = "";

  if (/applewebkit\/([\d.]+)/i.test(lowerUa)) {
    engine = "WebKit";
    const match = cleanUa.match(/AppleWebKit\/([\d.]+)/i);
    if (match) engineVersion = match[1];
    // If it's chrome/blink
    if (/chrome/i.test(lowerUa)) {
      engine = "Blink";
    }
  } else if (/gecko\/([\d.]+)/i.test(lowerUa)) {
    engine = "Gecko";
    const match = cleanUa.match(/rv:([\d.]+)/i);
    if (match) engineVersion = match[1];
  } else if (/trident\/([\d.]+)/i.test(lowerUa)) {
    engine = "Trident (IE)";
    const match = cleanUa.match(/rv:([\d.]+)/i);
    if (match) engineVersion = match[1];
  }

  // 5. Device Brand Detection
  let deviceBrand = "未知品牌";
  if (/iphone|ipad|ipod|macintosh/i.test(lowerUa)) {
    deviceBrand = "Apple (苹果)";
  } else if (/huawei|honor/i.test(lowerUa)) {
    deviceBrand = "Huawei (华为/荣耀)";
  } else if (/xiaomi|mi /i.test(lowerUa)) {
    deviceBrand = "Xiaomi (小米/红米)";
  } else if (/samsung|sm-/i.test(lowerUa)) {
    deviceBrand = "Samsung (三星)";
  } else if (/oppo/i.test(lowerUa)) {
    deviceBrand = "OPPO";
  } else if (/vivo/i.test(lowerUa)) {
    deviceBrand = "vivo";
  } else if (/oneplus/i.test(lowerUa)) {
    deviceBrand = "OnePlus (一加)";
  } else if (/pixel/i.test(lowerUa)) {
    deviceBrand = "Google Pixel";
  }

  // 6. Device Type / Form factor
  let device = "桌面端";
  const isMobile = /mobile|iphone|ipod|android|phone/i.test(lowerUa);
  const isTablet = /tablet|ipad|playbook|silk/i.test(lowerUa);
  
  if (isTablet) device = "平板电脑 (Tablet)";
  else if (isMobile) device = "智能手机 (Mobile)";

  // 7. Inner WebView environments (App containers)
  let webViewEnvironment = "标准浏览器环境";
  if (/micromessenger/i.test(lowerUa)) {
    webViewEnvironment = "微信内置浏览器 (WeChat)";
  } else if (/dingtalk/i.test(lowerUa)) {
    webViewEnvironment = "钉钉内置浏览器 (DingTalk)";
  } else if (/alipay/i.test(lowerUa)) {
    webViewEnvironment = "支付宝内置浏览器 (Alipay)";
  } else if (/lark/i.test(lowerUa)) {
    webViewEnvironment = "飞书内置浏览器 (Lark)";
  } else if (/weibo/i.test(lowerUa)) {
    webViewEnvironment = "微博内置浏览器 (Weibo)";
  } else if (/webview|wv/i.test(lowerUa)) {
    webViewEnvironment = "原生应用 WebView 容器";
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    engine,
    engineVersion,
    device,
    deviceBrand,
    isMobile: isMobile || isTablet,
    isBot,
    botName,
    webViewEnvironment
  };
}

export default function UserAgentParserTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Initialize with browser's own user-agent on mount safely
  useEffect(() => {
    if (typeof window !== "undefined" && window.navigator) {
      setInput(window.navigator.userAgent);
    }
  }, []);

  const result = parseUserAgentDetails(input);

  const handleLoadSelfUa = () => {
    if (typeof window !== "undefined" && window.navigator) {
      setInput(window.navigator.userAgent);
      setCopied(false);
    }
  };

  const copyUaText = async () => {
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <section className="tool-panel">
      {/* Visual layouts */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ua-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }
        .ua-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .ua-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          margin-top: 0.25rem;
        }
        .ua-badge--browser {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
        }
        .ua-badge--os {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
        }
        .ua-badge--device {
          background: rgba(168, 85, 247, 0.12);
          color: #a855f7;
        }
        .ua-badge--bot {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">日志与排查工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "分析浏览器 User-Agent 标头所代表的操作系统版本、浏览器类型、排版内核、设备品牌以及是否属于网络爬虫蜘蛛或特殊的内置 APP 容器。"}</p>
      </div>

      <div className="ua-container">
        {/* Text Input area */}
        <div className="ua-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)", fontWeight: 600 }}>User-Agent 字符串</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={handleLoadSelfUa} style={{ padding: "0 0.85rem", fontSize: "0.75rem", height: "26px" }}>
                🎯 载入我的 UA
              </button>
              <button type="button" onClick={copyUaText} disabled={!input} style={{ padding: "0 0.85rem", fontSize: "0.75rem", height: "26px" }}>
                {copied ? "已复制" : "复制 UA"}
              </button>
            </div>
          </div>
          <textarea 
            value={input} 
            onChange={(event) => { setInput(event.target.value); setCopied(false); }} 
            spellCheck={false}
            rows={3}
            placeholder="粘贴目标浏览器的 User-Agent 字符串进行多维度检测..."
            style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.825rem", lineHeight: 1.4 }}
          />
        </div>

        {/* Parsed Result Metrics Grid */}
        <div className="detail-grid">
          <article className="detail-card">
            <h3>浏览器及版本</h3>
            <p style={{ fontWeight: "700" }}>{result.browser} {result.browserVersion}</p>
            <span className="ua-badge ua-badge--browser">Browser</span>
          </article>
          <article className="detail-card">
            <h3>操作系统及版本</h3>
            <p style={{ fontWeight: "700" }}>{result.os} {result.osVersion ? `v${result.osVersion}` : ""}</p>
            <span className="ua-badge ua-badge--os">OS</span>
          </article>
          <article className="detail-card">
            <h3>设备类型 (Form Factor)</h3>
            <p style={{ fontWeight: "700" }}>{result.device}</p>
            <span className="ua-badge ua-badge--device">Device</span>
          </article>
        </div>

        {/* Detailed Breakdown Attributes */}
        <div className="ua-card">
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600", marginBottom: "1rem", borderBottom: "1px solid var(--border-default)", paddingBottom: "0.5rem" }}>
            🔍 多维度特征匹配结果
          </h3>
          
          <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <article>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>排版引擎 (Engine)</span>
              <p style={{ margin: "0.25rem 0 0", fontFamily: "var(--font-mono), monospace", fontSize: "0.85rem", fontWeight: 600 }}>
                {result.engine} {result.engineVersion ? `(v${result.engineVersion})` : ""}
              </p>
            </article>

            <article>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>设备品牌 (Brand)</span>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", fontWeight: 600 }}>
                {result.deviceBrand}
              </p>
            </article>

            <article>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>移动端特征 (Is Mobile)</span>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", fontWeight: 600, color: result.isMobile ? "#3b82f6" : "var(--text-secondary)" }}>
                {result.isMobile ? "✓ 是 (移动端/平板)" : "✗ 否 (桌面端)"}
              </p>
            </article>

            <article>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>容器环境 (Webview Host)</span>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", fontWeight: 600 }}>
                {result.webViewEnvironment}
              </p>
            </article>

            <article>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>搜索引擎爬虫 (Bot / Spider)</span>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", fontWeight: 600, color: result.isBot ? "#ef4444" : "var(--text-secondary)" }}>
                {result.isBot ? `✓ 是 (${result.botName})` : "✗ 否 (正常人请求)"}
              </p>
            </article>
          </div>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "1.25rem" }}>
        说明：User-Agent 仅作为排查和请求分群识别的粗略参考，客户端可以用 Header 伪造此字段；需要强校验设备能力建议使用特性检测（Feature Detection）。
      </p>
    </section>
  );
}
