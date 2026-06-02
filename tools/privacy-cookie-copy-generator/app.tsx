"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type CookieCategory = "necessary" | "analytics" | "personalization" | "marketing";

const cookieLabels: Record<CookieCategory, string> = {
  necessary: "必要",
  analytics: "分析",
  personalization: "个性化",
  marketing: "营销"
};

const initialCookies: Record<CookieCategory, boolean> = {
  necessary: true,
  analytics: true,
  personalization: false,
  marketing: false
};

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function bulletList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- 暂未填写";
}

function buildCopy(input: {
  appName: string;
  company: string;
  region: string;
  dataTypes: string[];
  purposes: string[];
  vendors: string[];
  retention: string;
  contact: string;
  cookies: Record<CookieCategory, boolean>;
}) {
  const enabledCookies = (Object.keys(input.cookies) as CookieCategory[]).filter((key) => input.cookies[key]);
  const cookieLines = enabledCookies.map((key) => `- ${cookieLabels[key]} Cookie：${key === "necessary"
    ? "用于登录、安全、防欺诈和偏好保存。"
    : key === "analytics"
      ? "用于统计访问、页面性能和产品使用情况。"
      : key === "personalization"
        ? "用于记住界面语言、主题和内容偏好。"
        : "用于衡量活动效果和展示更相关的信息。"}`);

  const privacyPolicy = [
    `# ${input.appName} 隐私政策草稿`,
    "",
    `${input.company} 提供 ${input.appName}。我们仅在提供、保护和改进服务所需范围内处理个人信息。适用区域：${input.region}。`,
    "",
    "## 我们处理的数据",
    bulletList(input.dataTypes),
    "",
    "## 使用目的",
    bulletList(input.purposes),
    "",
    "## 第三方服务",
    input.vendors.length ? bulletList(input.vendors) : "- 暂无第三方处理方",
    "",
    "## 保留期限",
    input.retention,
    "",
    "## 您的选择",
    "您可以请求访问、更正、删除或导出个人信息，也可以撤回非必要 Cookie 同意。我们会在适用法律要求的期限内响应。",
    "",
    "## 联系方式",
    input.contact
  ].join("\n");

  const cookieBanner = [
    `${input.appName} 使用 Cookie 来保持服务安全、记住偏好并分析产品使用情况。`,
    enabledCookies.includes("analytics") || enabledCookies.includes("marketing")
      ? "您可以接受全部 Cookie，也可以仅启用必要 Cookie。"
      : "当前仅启用提供服务所必需的 Cookie。",
    "",
    "Cookie 类别：",
    cookieLines.join("\n")
  ].join("\n");

  return { privacyPolicy, cookieBanner };
}

export default function PrivacyCookieCopyGeneratorTool({ manifest }: ToolAppProps) {
  const [appName, setAppName] = useState("Tool Platform");
  const [company, setCompany] = useState("Example Inc.");
  const [region, setRegion] = useState("United States / GDPR-ready");
  const [dataTypes, setDataTypes] = useState("Account email, Usage logs, Billing metadata, Support messages");
  const [purposes, setPurposes] = useState("Provide the service, Secure accounts, Improve product quality, Respond to support requests");
  const [vendors, setVendors] = useState("Cloud hosting provider, Payment processor, Product analytics provider");
  const [retention, setRetention] = useState("账号数据在账户有效期间保留；日志通常保留 30-90 天；账务记录按税务和会计要求保留。");
  const [contact, setContact] = useState("privacy@example.com");
  const [cookies, setCookies] = useState(initialCookies);
  const [copied, setCopied] = useState("");
  const copy = useMemo(() => buildCopy({
    appName,
    company,
    region,
    dataTypes: splitCsv(dataTypes),
    purposes: splitCsv(purposes),
    vendors: splitCsv(vendors),
    retention,
    contact,
    cookies
  }), [appName, company, contact, cookies, dataTypes, purposes, region, retention, vendors]);

  function updateCookie(key: CookieCategory, value: boolean) {
    setCopied("");
    setCookies((current) => ({ ...current, [key]: value }));
  }

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">隐私文案</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>应用名称</span>
          <input value={appName} onChange={(event) => setAppName(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>公司</span>
          <input value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>适用区域</span>
          <input value={region} onChange={(event) => setRegion(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>联系方式</span>
          <input value={contact} onChange={(event) => setContact(event.target.value)} />
        </label>
      </div>

      <div className="tool-option-list">
        {(Object.keys(cookieLabels) as CookieCategory[]).map((key) => (
          <label key={key} className="tool-check">
            <input type="checkbox" checked={cookies[key]} onChange={(event) => updateCookie(key, event.target.checked)} />
            <span>{cookieLabels[key]}</span>
          </label>
        ))}
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>数据类型</span>
          <textarea value={dataTypes} onChange={(event) => setDataTypes(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>使用目的</span>
          <textarea value={purposes} onChange={(event) => setPurposes(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>供应商</span>
          <textarea value={vendors} onChange={(event) => setVendors(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>保留期限</span>
          <textarea value={retention} onChange={(event) => setRetention(event.target.value)} spellCheck={false} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyText("policy", copy.privacyPolicy)}>{copied === "policy" ? "已复制政策" : "复制政策"}</button>
        <button type="button" onClick={() => void copyText("banner", copy.cookieBanner)}>{copied === "banner" ? "已复制 Cookie Banner" : "复制 Cookie Banner"}</button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>隐私政策草稿</span>
          <textarea value={copy.privacyPolicy} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Cookie Banner 草稿</span>
          <textarea value={copy.cookieBanner} readOnly spellCheck={false} />
        </label>
      </div>
      <p className="tool-note">文案草稿需要结合实际数据流、法域和供应商清单复核。</p>
    </section>
  );
}
