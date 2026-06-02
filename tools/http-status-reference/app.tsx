"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const statuses = [
  { code: 200, title: "OK", group: "2xx", note: "请求成功，响应体包含目标资源或操作结果。" },
  { code: 201, title: "Created", group: "2xx", note: "资源已创建，常用于 POST 创建接口。" },
  { code: 204, title: "No Content", group: "2xx", note: "操作成功但没有响应体，常用于删除或更新。" },
  { code: 301, title: "Moved Permanently", group: "3xx", note: "资源永久移动，客户端和搜索引擎可更新地址。" },
  { code: 302, title: "Found", group: "3xx", note: "临时重定向，后续请求仍应使用原 URL。" },
  { code: 304, title: "Not Modified", group: "3xx", note: "缓存仍有效，客户端可以复用本地缓存。" },
  { code: 400, title: "Bad Request", group: "4xx", note: "请求格式或参数错误。" },
  { code: 401, title: "Unauthorized", group: "4xx", note: "未认证或认证信息无效。" },
  { code: 403, title: "Forbidden", group: "4xx", note: "已认证但没有权限访问资源。" },
  { code: 404, title: "Not Found", group: "4xx", note: "资源不存在或不对外暴露。" },
  { code: 409, title: "Conflict", group: "4xx", note: "请求与当前资源状态冲突，例如版本冲突。" },
  { code: 422, title: "Unprocessable Content", group: "4xx", note: "语义校验失败，常用于表单字段错误。" },
  { code: 429, title: "Too Many Requests", group: "4xx", note: "触发限流，需要退避或等待重试。" },
  { code: 500, title: "Internal Server Error", group: "5xx", note: "服务端未处理异常。" },
  { code: 502, title: "Bad Gateway", group: "5xx", note: "网关从上游收到无效响应。" },
  { code: 503, title: "Service Unavailable", group: "5xx", note: "服务暂不可用，可能是维护或过载。" },
  { code: 504, title: "Gateway Timeout", group: "5xx", note: "网关等待上游响应超时。" }
];

export default function HttpStatusReferenceTool({ manifest }: ToolAppProps) {
  const [query, setQuery] = useState("404");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = statuses.filter((status) => {
    const text = (status.code + " " + status.title + " " + status.group + " " + status.note).toLowerCase();

    return text.includes(normalizedQuery);
  });
  const groupCounts = statuses.reduce<Record<string, number>>((counts, status) => {
    counts[status.group] = (counts[status.group] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">HTTP 速查</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>状态码</h3><p>{statuses.length}</p></article>
        <article className="detail-card"><h3>匹配</h3><p>{filtered.length}</p></article>
        <article className="detail-card"><h3>4xx 数量</h3><p>{groupCounts["4xx"] ?? 0}</p></article>
      </div>
      <label className="tool-field">
        <span>搜索状态码、标题或描述</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="case-grid">
        {filtered.length > 0 ? filtered.map((status) => (
          <article key={status.code} className="detail-card">
            <p className="eyebrow">{status.group}</p>
            <h3>{status.code} {status.title}</h3>
            <p>{status.note}</p>
          </article>
        )) : <article className="detail-card"><h3>没有匹配</h3><p>换一个状态码、分组或中文关键词。</p></article>}
      </div>
    </section>
  );
}
