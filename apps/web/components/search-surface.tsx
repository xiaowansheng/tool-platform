"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { searchTools, type ToolManifest } from "@tool-platform/tool-sdk";

import { getToolPageManifest } from "@/lib/tool-page-copy";
import { fetchToolRanking } from "@/lib/stats-client";

import { ToolCard } from "./tool-card";

function getRelevanceScore(tool: ToolManifest, query: string): number {
  const normQuery = query.trim().toLowerCase();
  if (!normQuery) return 0;

  const normName = tool.name.toLowerCase();
  const normDesc = tool.description.toLowerCase();
  let score = 0;

  // 1. Exact Name match gets highest score
  if (normName === normQuery) {
    score += 1000;
  }
  // 2. Name starts with query
  else if (normName.startsWith(normQuery)) {
    score += 800;
  }
  // 3. Name contains query
  else if (normName.includes(normQuery)) {
    score += 500;
  }
  
  // 4. Subcategory matches
  if (tool.subCategory && tool.subCategory.toLowerCase() === normQuery) {
    score += 300;
  } else if (tool.subCategory && tool.subCategory.toLowerCase().includes(normQuery)) {
    score += 150;
  }

  // 5. Tags matches
  if (tool.tags) {
    tool.tags.forEach(tag => {
      const normTag = tag.toLowerCase();
      if (normTag === normQuery) {
        score += 200;
      } else if (normTag.includes(normQuery)) {
        score += 100;
      }
    });
  }

  // 6. Description contains query
  if (normDesc.includes(normQuery)) {
    score += 50;
  }

  // 7. Category matches
  if (tool.category && tool.category.toLowerCase() === normQuery) {
    score += 20;
  }

  return score;
}

export function SearchSurface({
  tools,
  initialQuery = "",
  title,
  subtitle,
  placeholder,
  emptyTitle,
  emptyDescription
}: {
  tools: ToolManifest[];
  initialQuery?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const t = useTranslations("search");
  const locale = useLocale();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const localizedTools = useMemo(() => tools.map((tool) => getToolPageManifest(tool, locale)), [tools, locale]);
  const filteredTools = searchTools(localizedTools, deferredQuery);
  const [visitMap, setVisitMap] = useState<Map<string, number>>(new Map());

  const sortedTools = useMemo(() => {
    const normQuery = deferredQuery.trim().toLowerCase();
    if (!normQuery) {
      return [...filteredTools].sort(
        (a, b) => (visitMap.get(b.id) ?? 0) - (visitMap.get(a.id) ?? 0)
      );
    }

    return [...filteredTools].sort((a, b) => {
      const scoreA = getRelevanceScore(a, normQuery);
      const scoreB = getRelevanceScore(b, normQuery);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return (visitMap.get(b.id) ?? 0) - (visitMap.get(a.id) ?? 0);
    });
  }, [filteredTools, deferredQuery, visitMap]);

  useEffect(() => {
    let mounted = true;
    fetchToolRanking(100).then((items) => {
      if (!mounted) return;
      const map = new Map<string, number>();
      for (const item of items) {
        map.set(item.toolId, item.visitCount);
      }
      setVisitMap(map);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="search-surface">
      <div className="section-header">
        <div>
          <h2>{title ?? t("title")}</h2>
          <p>{subtitle ?? t("subtitle")}</p>
        </div>
        <span className="pill">{t("results", { count: sortedTools.length })}</span>
      </div>
      <div className="search-row">
        <input
          aria-label={t("ariaLabel")}
          placeholder={placeholder ?? t("placeholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")}>
            {t("clear")}
          </button>
        ) : (
          <button type="button" disabled style={{ opacity: 0.4 }}>
            {t("clear")}
          </button>
        )}
      </div>
      {sortedTools.length > 0 ? (
        <div className="card-grid">
          {sortedTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} visitCount={visitMap.get(tool.id) ?? 0} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>{emptyTitle ?? t("emptyTitle")}</strong>
          <p>{emptyDescription ?? t("emptyDescription")}</p>
        </div>
      )}
    </section>
  );
}
