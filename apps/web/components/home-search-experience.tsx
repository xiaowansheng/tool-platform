"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { searchTools, type ToolManifest } from "@tool-platform/tool-sdk";

import { getToolPageManifest } from "@/lib/tool-page-copy";
import { fetchToolRanking } from "@/lib/stats-client";

import { CategoryPanel } from "./category-panel";
import { FeaturedToolsSection } from "./featured-tools-section";
import { ToolCard } from "./tool-card";

export const HOME_SEARCH_INPUT_ID = "home-search-input";

function normalizeQuery(value: string) {
  return value.trim();
}

export function HomeSearchExperience({
  initialQuery,
  tools
}: {
  initialQuery: string;
  tools: ToolManifest[];
}) {
  const t = useTranslations("home");
  const searchT = useTranslations("search");
  const locale = useLocale();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const localizedTools = useMemo(() => tools.map((tool) => getToolPageManifest(tool, locale)), [tools, locale]);
  const filteredTools = searchTools(localizedTools, deferredQuery);
  const [visitMap, setVisitMap] = useState<Map<string, number>>(new Map());
  const hasQuery = normalizeQuery(deferredQuery).length > 0;
  const suggestionQueries = useMemo(
    () => (locale === "zh" ? ["json", "api", "安全", "设计"] : ["json", "api", "security", "design"]),
    [locale]
  );

  const sortedTools = useMemo(() => {
    if (hasQuery) {
      return filteredTools;
    }

    return [...filteredTools].sort(
      (a, b) => (visitMap.get(b.id) ?? 0) - (visitMap.get(a.id) ?? 0)
    );
  }, [filteredTools, hasQuery, visitMap]);

  useEffect(() => {
    let mounted = true;

    fetchToolRanking(100).then((items) => {
      if (!mounted) {
        return;
      }

      const map = new Map<string, number>();
      for (const item of items) {
        map.set(item.toolId, item.visitCount);
      }
      setVisitMap(map);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextQuery = normalizeQuery(query);

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [query]);

  useEffect(() => {
    function focusSearch() {
      if (window.location.hash !== "#search") {
        return;
      }

      const input = document.getElementById(HOME_SEARCH_INPUT_ID);

      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    }

    const frame = window.requestAnimationFrame(focusSearch);
    window.addEventListener("hashchange", focusSearch);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", focusSearch);
    };
  }, []);

  return (
    <div className="content-stack">
      <section className="hero hero--search">
        <div>
          <span className="pill">{t("heroEyebrow")}</span>
          <h2>{t("heroTitle")}</h2>
          <p>{t("heroDescription")}</p>
        </div>

        <label className="hero-search" htmlFor={HOME_SEARCH_INPUT_ID}>
          <span className="hero-search__icon" aria-hidden="true">
            <Search size={18} strokeWidth={2} />
          </span>
          <input
            id={HOME_SEARCH_INPUT_ID}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchT("placeholder")}
            aria-label={searchT("ariaLabel")}
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")}>
              {searchT("clear")}
            </button>
          ) : (
            <span className="hero-search__shortcut" aria-hidden="true">⌘K / Ctrl+K</span>
          )}
        </label>

        {!hasQuery ? (
          <div className="hero-search__suggestions">
            {suggestionQueries.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="tag tag--action"
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {hasQuery ? (
        <section className="search-surface">
          <div className="section-header">
            <div>
              <h2>{t("searchResultsTitle")}</h2>
              <p>{t("searchResultsDescription")}</p>
            </div>
            <span className="pill">{searchT("results", { count: sortedTools.length })}</span>
          </div>
          {sortedTools.length > 0 ? (
            <div className="card-grid">
              {sortedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} visitCount={visitMap.get(tool.id) ?? 0} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>{searchT("emptyTitle")}</strong>
              <p>{searchT("emptyDescription")}</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <FeaturedToolsSection />
          <CategoryPanel />
        </>
      )}
    </div>
  );
}
