"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

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
    `# ${serviceName.trim() || "API"} Error Codes`,
    "",
    baseUrl.trim() ? `Base URL: \`${baseUrl.trim()}\`` : "",
    "",
    "## Error Response Envelope",
    "",
    "```json",
    JSON.stringify({
      error: {
        code: exampleCode,
        message: rows[0]?.message || "Human readable error message",
        requestId: "req_01HX...",
        details: {}
      }
    }, null, 2),
    "```",
    "",
    "## Error Codes",
    "",
    "| Code | HTTP | Message | Cause | Client action |",
    "| --- | --- | --- | --- | --- |",
    ...(tableRows.length > 0 ? tableRows : ["| `ERROR_CODE` | 400 | Message | Cause | Action |"]),
    "",
    "## HTTP Status Groups",
    "",
    ...(statusGroups.length > 0 ? statusGroups.map((status) => `- \`${status}\`: ${rows.filter((row) => row.httpStatus === status).length} documented error code(s)`) : ["- Add error rows to generate status groups."]),
    "",
    "## Client Handling Guidance",
    "",
    "- Treat `401` as an authentication refresh or re-login signal.",
    "- Treat `403` as an authorization or plan entitlement failure.",
    "- Retry `429` and `5xx` responses only with backoff and idempotency protection.",
    "- Log `requestId` with support tickets and incident reports."
  ].filter((line) => line !== "").join("\n");
}

export default function ApiErrorCodeDocGeneratorTool({ manifest }: ToolClientProps) {
  const [serviceName, setServiceName] = useState("Tool Platform API");
  const [baseUrl, setBaseUrl] = useState("https://api.example.com/v1");
  const [input, setInput] = useState(sampleErrorCodes);
  const [copied, setCopied] = useState(false);
  const rows = parseErrorRows(input);
  const docs = buildErrorDocs(serviceName, baseUrl, rows);

  async function copyDocs() {
    await navigator.clipboard.writeText(docs);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">API Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Service name</span>
          <input value={serviceName} onChange={(event) => setServiceName(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Base URL</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyDocs()}>{copied ? "已复制" : "复制文档"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Error rows</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Markdown docs</span>
          <textarea value={docs} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>Parsed</span>
          <span>Message</span>
        </div>
        {rows.map((row) => (
          <div className="tool-table__row" key={row.code}>
            <span>{row.code} / {row.httpStatus}</span>
            <span>{row.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
