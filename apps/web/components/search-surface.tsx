"use client";

import { useDeferredValue, useState } from "react";

import { searchTools, type ToolManifest } from "@tool-platform/tool-sdk";

import { ToolCard } from "./tool-card";

export function SearchSurface({
  tools,
  initialQuery = "",
  title = "搜索工具",
  subtitle = "支持按工具名、分类、标签和描述检索。"
}: {
  tools: ToolManifest[];
  initialQuery?: string;
  title?: string;
  subtitle?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const filteredTools = searchTools(tools, deferredQuery);

  return (
    <section className="search-surface">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="pill">{filteredTools.length} results</span>
      </div>
      <div className="search-row">
        <input
          aria-label="搜索工具"
          placeholder="输入工具名、标签或分类，例如 json / 开发 / encoding"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" onClick={() => setQuery("")}>
          清空
        </button>
      </div>
      {filteredTools.length > 0 ? (
        <div className="card-grid">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>没有命中当前查询</strong>
          <p>尝试按标签或分类搜索，例如 `formatter`、`开发工具`、`encoding`。</p>
        </div>
      )}
    </section>
  );
}
