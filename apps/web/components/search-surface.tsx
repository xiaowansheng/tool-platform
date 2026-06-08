"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { searchTools, type ToolManifest } from "@tool-platform/tool-sdk";

import { getToolPageManifest } from "@/lib/tool-page-copy";
import { fetchToolRanking } from "@/lib/stats-client";

import { ToolCard } from "./tool-card";

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
        <span className="pill">{t("results", { count: filteredTools.length })}</span>
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
      {filteredTools.length > 0 ? (
        <div className="card-grid">
          {filteredTools.map((tool) => (
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
