"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ErrorCodeRow {
  code: string;
  httpStatus: string;
  message: string;
  cause: string;
  action: string;
}

const sampleErrorCodes = `AUTH_INVALID_TOKEN,401,Token is invalid,JWT verification failed,Request a new token and retry
AUTH_FORBIDDEN,403,Permission denied,User lacks required role,Ask an admin to grant access
RATE_LIMITED,429,Too many requests,Client exceeded the request quota,Back off and retry after the reset time
VALIDATION_FAILED,422,Validation failed,Request body does not match schema,Fix the invalid fields and resubmit`;

function parseErrorRows(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^code[,|\t]/i.test(line))
    .map((line): ErrorCodeRow => {
      const delimiter = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
      const [code = "", httpStatus = "", message = "", cause = "", action = ""] = line.split(delimiter).map((cell) => cell.trim());

      return { code, httpStatus, message, cause, action };
    });
}

function buildErrorDocs(serviceName: string, baseUrl: string, rows: ErrorCodeRow[]) {
  const exampleCode = rows[0]?.code || "ERROR_CODE";
  const tableRows = rows.map((row) => `| \`${row.code}\` | ${row.httpStatus} | ${row.message} | ${row.cause} | ${row.action} |`);
  const statusGroups = Array.from(new Set(rows.map((row) => row.httpStatus).filter(Boolean))).sort();

  return [
    `# ${serviceName.trim() || "API"} 错误码文档`,
    "",
    baseUrl.trim() ? `基础 URL: \`${baseUrl.trim()}\`` : "",
    "",
    "## 错误响应格式",
    "",
    "```json",
    JSON.stringify({
      error: {
        code: exampleCode,
        message: rows[0]?.message || "人类可读的错误消息",
        requestId: "req_01HX...",
        details: {}
      }
    }, null, 2),
    "```",
    "",
    "## 错误码列表",
    "",
    "| 错误码 | HTTP 状态码 | 消息 | 原因 | 客户端处理建议 |",
    "| --- | --- | --- | --- | --- |",
    ...(tableRows.length > 0 ? tableRows : ["| `ERROR_CODE` | 400 | 消息 | 原因 | 处理建议 |"]),
    "",
    "## HTTP 状态分组",
    "",
    ...(statusGroups.length > 0 ? statusGroups.map((status) => `- \`${status}\`: ${rows.filter((row) => row.httpStatus === status).length} 个已记录的错误码`) : ["- 添加错误码行以生成状态分组。"]),
    "",
    "## 客户端处理指引",
    "",
    "- `401`：触发身份认证刷新或重新登录。",
    "- `403`：表示授权或套餐权限不足。",
    "- `429` 及 `5xx`：仅在带有退避和幂等保护的情况下重试。",
    "- 在支持工单和事故报告中附上 `requestId`。"
  ].filter((line) => line !== "").join("\n");
}

export default function ApiErrorCodeDocGeneratorTool({ manifest }: ToolAppProps) {
  const [serviceName, setServiceName] = useState("Tool Platform API");
  const [baseUrl, setBaseUrl] = useState("https://api.example.com/v1");
  const [input, setInput] = useState(sampleErrorCodes);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const rows = parseErrorRows(input);
  const docs = buildErrorDocs(serviceName, baseUrl, rows);

  async function copyDocs() {
    try {
      await navigator.clipboard.writeText(docs);
      setCopied(true);
      setCopyError("");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopyError("复制失败，请检查权限");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">API 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>服务名称</span>
          <input value={serviceName} onChange={(event) => setServiceName(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>基础 URL</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyDocs()}>{copied ? "已复制" : "复制文档"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>错误行</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Markdown 文档</span>
          <textarea value={docs} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>已解析</span>
          <span>消息</span>
        </div>
        {rows.map((row) => (
          <div className="tool-table__row" key={row.code}>
            <span>{row.code} / {row.httpStatus}</span>
            <span>{row.message}</span>
          </div>
        ))}
      </div>
      {copyError ? <p className="tool-error">{copyError}</p> : null}
      <p className="tool-note">使用逗号、竖线或制表符分隔错误码数据，自动生成 Markdown 格式的错误码文档。</p>
    </section>
  );
}
