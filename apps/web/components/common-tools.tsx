"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, ExternalLink, Star, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { getCategoryMeta, searchTools, type ToolManifest } from "@tool-platform/tool-sdk";

import {
  addFavoriteTool,
  clearCommonTools,
  clearFavoriteTools,
  COMMON_TOOLS_CATEGORY_ID,
  FAVORITE_TOOLS_CATEGORY_ID,
  readCommonToolRecords,
  readFavoriteToolRecords,
  recordCommonToolUsage,
  removeCommonTool,
  removeFavoriteTool,
  subscribeCommonTools,
  subscribeFavoriteTools,
  type CommonToolRecord,
  type FavoriteToolRecord
} from "@/lib/common-tools";
import { Link } from "@/i18n/navigation";
import { getRuntimeLabel, getToolPageManifest } from "@/lib/tool-page-copy";

const TOOL_CARD_VISIBLE_TAGS = 4;

function useCommonToolRecords() {
  const [records, setRecords] = useState<CommonToolRecord[]>([]);

  useEffect(() => {
    function refreshRecords() {
      setRecords(readCommonToolRecords());
    }

    refreshRecords();
    return subscribeCommonTools(refreshRecords);
  }, []);

  return records;
}

function useFavoriteToolRecords() {
  const [records, setRecords] = useState<FavoriteToolRecord[]>([]);

  useEffect(() => {
    function refreshRecords() {
      setRecords(readFavoriteToolRecords());
    }

    refreshRecords();
    return subscribeFavoriteTools(refreshRecords);
  }, []);

  return records;
}

export function FavoriteToolButton({
  toolId,
  toolName,
  showLabel = false
}: {
  toolId: string;
  toolName: string;
  showLabel?: boolean;
}) {
  const t = useTranslations("favoriteTools");
  const records = useFavoriteToolRecords();
  const favorite = records.some((record) => record.id === toolId);
  const label = favorite ? t("removeAria", { name: toolName }) : t("addAria", { name: toolName });

  function toggleFavorite() {
    if (favorite) {
      removeFavoriteTool(toolId);
    } else {
      addFavoriteTool(toolId);
    }
  }

  return (
    <button
      type="button"
      className={`favorite-button${favorite ? " favorite-button--active" : ""}${showLabel ? " favorite-button--label" : ""}`}
      aria-label={label}
      aria-pressed={favorite}
      title={label}
      onClick={toggleFavorite}
    >
      <Star aria-hidden="true" size={15} strokeWidth={2} fill={favorite ? "currentColor" : "none"} />
      {showLabel ? <span>{favorite ? t("favorited") : t("add")}</span> : null}
    </button>
  );
}

export function ToolUsageTracker({ toolId }: { toolId: string }) {
  const lastRecordedToolIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastRecordedToolIdRef.current === toolId) {
      return;
    }

    lastRecordedToolIdRef.current = toolId;
    recordCommonToolUsage(toolId);
  }, [toolId]);

  return null;
}

export function CommonToolsSidebarLink() {
  const t = useTranslations("commonTools");
  const records = useCommonToolRecords();

  return (
    <Link className="sidebar__link" href={`/categories/${COMMON_TOOLS_CATEGORY_ID}`}>
      <Clock3 className="sidebar__link-icon" aria-hidden="true" size={18} strokeWidth={2} />
      <span>{t("title")}</span>
      <span className="sidebar__link-count">{records.length}</span>
    </Link>
  );
}

export function FavoriteToolsSidebarLink() {
  const t = useTranslations("favoriteTools");
  const records = useFavoriteToolRecords();

  return (
    <Link className="sidebar__link" href={`/categories/${FAVORITE_TOOLS_CATEGORY_ID}`}>
      <Star className="sidebar__link-icon" aria-hidden="true" size={18} strokeWidth={2} />
      <span>{t("title")}</span>
      <span className="sidebar__link-count">{records.length}</span>
    </Link>
  );
}

export function CommonToolsCategoryCard() {
  const t = useTranslations("commonTools");
  const records = useCommonToolRecords();

  return (
    <Link className="category-card" href={`/categories/${COMMON_TOOLS_CATEGORY_ID}`}>
      <span className="category-card__icon">
        <Clock3 aria-hidden="true" size={16} strokeWidth={2} />
      </span>
      <h3>{t("title")}</h3>
      <p title={t("categoryDescription")}>{t("categoryDescription")}</p>
      <span className="category-card__count">{records.length}</span>
      <span className="category-card__tooltip">{t("categoryDescription")}</span>
    </Link>
  );
}

export function FavoriteToolsCategoryCard() {
  const t = useTranslations("favoriteTools");
  const records = useFavoriteToolRecords();

  return (
    <Link className="category-card" href={`/categories/${FAVORITE_TOOLS_CATEGORY_ID}`}>
      <span className="category-card__icon">
        <Star aria-hidden="true" size={16} strokeWidth={2} />
      </span>
      <h3>{t("title")}</h3>
      <p title={t("categoryDescription")}>{t("categoryDescription")}</p>
      <span className="category-card__count">{records.length}</span>
      <span className="category-card__tooltip">{t("categoryDescription")}</span>
    </Link>
  );
}

export function CommonToolsPage({ tools }: { tools: ToolManifest[] }) {
  const t = useTranslations("commonTools");
  const locale = useLocale();
  const records = useCommonToolRecords();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const recordByToolId = useMemo(() => {
    return new Map(records.map((record) => [record.id, record]));
  }, [records]);

  const commonTools = useMemo(() => {
    const toolById = new Map(tools.map((tool) => [tool.id, tool]));

    return records
      .map((record) => toolById.get(record.id))
      .filter((tool): tool is ToolManifest => Boolean(tool));
  }, [records, tools]);

  const localizedCommonTools = useMemo(() => {
    return commonTools.map((tool) => getToolPageManifest(tool, locale));
  }, [commonTools, locale]);

  const filteredTools = searchTools(localizedCommonTools, deferredQuery);
  const hasTools = commonTools.length > 0;

  return (
    <div className="content-stack">
      <section className="search-surface">
        <div className="section-header">
          <div>
            <h2>{t("filterTitle")}</h2>
            <p>{t("filterDescription")}</p>
          </div>
          <div className="common-tools__actions">
            <span className="pill">{t("results", { count: filteredTools.length })}</span>
            {hasTools ? (
              <button type="button" className="button--danger" onClick={clearCommonTools}>
                <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                {t("clear")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="search-row">
          <input
            aria-label={t("searchAriaLabel")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")}>
              {t("clearSearch")}
            </button>
          ) : (
            <button type="button" disabled style={{ opacity: 0.4 }}>
              {t("clearSearch")}
            </button>
          )}
        </div>

        {filteredTools.length > 0 ? (
          <div className="card-grid">
            {filteredTools.map((tool) => (
              <CommonToolCard
                key={tool.id}
                tool={tool}
                record={recordByToolId.get(tool.id)}
                onRemove={() => removeCommonTool(tool.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>{hasTools ? t("emptyFiltered") : t("emptyTitle")}</strong>
            <p>{hasTools ? t("emptyFilteredDescription") : t("emptyDescription")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function FavoriteToolsPage({ tools }: { tools: ToolManifest[] }) {
  const t = useTranslations("favoriteTools");
  const locale = useLocale();
  const records = useFavoriteToolRecords();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const favoriteTools = useMemo(() => {
    const toolById = new Map(tools.map((tool) => [tool.id, tool]));

    return records
      .map((record) => toolById.get(record.id))
      .filter((tool): tool is ToolManifest => Boolean(tool));
  }, [records, tools]);

  const localizedFavoriteTools = useMemo(() => {
    return favoriteTools.map((tool) => getToolPageManifest(tool, locale));
  }, [favoriteTools, locale]);

  const filteredTools = searchTools(localizedFavoriteTools, deferredQuery);
  const hasTools = favoriteTools.length > 0;

  return (
    <div className="content-stack">
      <section className="search-surface">
        <div className="section-header">
          <div>
            <h2>{t("filterTitle")}</h2>
            <p>{t("filterDescription")}</p>
          </div>
          <div className="common-tools__actions">
            <span className="pill">{t("results", { count: filteredTools.length })}</span>
            {hasTools ? (
              <button type="button" className="button--danger" onClick={clearFavoriteTools}>
                <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                {t("clear")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="search-row">
          <input
            aria-label={t("searchAriaLabel")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")}>
              {t("clearSearch")}
            </button>
          ) : (
            <button type="button" disabled style={{ opacity: 0.4 }}>
              {t("clearSearch")}
            </button>
          )}
        </div>

        {filteredTools.length > 0 ? (
          <div className="card-grid">
            {filteredTools.map((tool) => (
              <FavoriteToolCard key={tool.id} tool={tool} onRemove={() => removeFavoriteTool(tool.id)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>{hasTools ? t("emptyFiltered") : t("emptyTitle")}</strong>
            <p>{hasTools ? t("emptyFilteredDescription") : t("emptyDescription")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CommonToolCard({
  tool,
  record,
  onRemove
}: {
  tool: ToolManifest;
  record?: CommonToolRecord;
  onRemove: () => void;
}) {
  const t = useTranslations("commonTools");
  const locale = useLocale();
  const displayTool = getToolPageManifest(tool, locale);
  const runtimeLabel = getRuntimeLabel(tool.runtime, locale);
  const toolCardT = useTranslations("toolCard");
  const ct = useTranslations("categories");
  const category = getCategoryMeta(tool.category);
  const visibleTags = tool.tags.slice(0, TOOL_CARD_VISIBLE_TAGS);
  const hiddenTagCount = tool.tags.length - visibleTags.length;
  const tagSummary = tool.tags.join(", ");
  const categoryLabel = category ? ct(`${category.id}.label`) : tool.category;

  return (
    <article className="tool-card tool-card--common">
      <div className="tool-card__header">
        <div className="tool-card__title-group">
          <p className="eyebrow">{categoryLabel}</p>
          <h3 title={displayTool.name}>{displayTool.name}</h3>
        </div>
        <div className="tool-card__badges">
          <FavoriteToolButton toolId={tool.id} toolName={displayTool.name} />
          <span className="pill pill--runtime" data-runtime={tool.runtime}>
            {runtimeLabel}
          </span>
        </div>
      </div>
      <p className="tool-card__description" title={displayTool.description}>
        {displayTool.description}
      </p>
      <div className="tag-list" role="list" aria-label={toolCardT("tagsLabel", { tags: tagSummary })} title={tagSummary}>
        {visibleTags.map((tag) => (
          <span key={tag} className="tag" role="listitem">
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 ? (
          <span className="tag tag--more" role="listitem" aria-label={toolCardT("moreTags", { count: hiddenTagCount })}>
            +{hiddenTagCount}
          </span>
        ) : null}
      </div>
      {record ? <span className="tool-card__usage">{t("usageCount", { count: record.useCount })}</span> : null}
      <div className="tool-card__actions">
        <Link className="button-link button-link--accent" href={"/tools/" + tool.id}>
          <ExternalLink aria-hidden="true" size={14} strokeWidth={2} />
          {toolCardT("enterTool")}
        </Link>
        <button type="button" className="button--danger" onClick={onRemove} aria-label={t("removeAria", { name: displayTool.name })}>
          <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
          {t("remove")}
        </button>
      </div>
    </article>
  );
}

function FavoriteToolCard({
  tool,
  onRemove
}: {
  tool: ToolManifest;
  onRemove: () => void;
}) {
  const t = useTranslations("favoriteTools");
  const locale = useLocale();
  const displayTool = getToolPageManifest(tool, locale);
  const runtimeLabel = getRuntimeLabel(tool.runtime, locale);
  const toolCardT = useTranslations("toolCard");
  const ct = useTranslations("categories");
  const category = getCategoryMeta(tool.category);
  const visibleTags = tool.tags.slice(0, TOOL_CARD_VISIBLE_TAGS);
  const hiddenTagCount = tool.tags.length - visibleTags.length;
  const tagSummary = tool.tags.join(", ");
  const categoryLabel = category ? ct(`${category.id}.label`) : tool.category;

  return (
    <article className="tool-card tool-card--favorite">
      <div className="tool-card__header">
        <div className="tool-card__title-group">
          <p className="eyebrow">{categoryLabel}</p>
          <h3 title={displayTool.name}>{displayTool.name}</h3>
        </div>
        <div className="tool-card__badges">
          <FavoriteToolButton toolId={tool.id} toolName={displayTool.name} />
          <span className="pill pill--runtime" data-runtime={tool.runtime}>
            {runtimeLabel}
          </span>
        </div>
      </div>
      <p className="tool-card__description" title={displayTool.description}>
        {displayTool.description}
      </p>
      <div className="tag-list" role="list" aria-label={toolCardT("tagsLabel", { tags: tagSummary })} title={tagSummary}>
        {visibleTags.map((tag) => (
          <span key={tag} className="tag" role="listitem">
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 ? (
          <span className="tag tag--more" role="listitem" aria-label={toolCardT("moreTags", { count: hiddenTagCount })}>
            +{hiddenTagCount}
          </span>
        ) : null}
      </div>
      <div className="tool-card__actions tool-card__actions--pinned">
        <Link className="button-link button-link--accent" href={"/tools/" + tool.id}>
          <ExternalLink aria-hidden="true" size={14} strokeWidth={2} />
          {toolCardT("enterTool")}
        </Link>
        <button type="button" className="button--danger" onClick={onRemove} aria-label={t("removeAria", { name: displayTool.name })}>
          <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
          {t("remove")}
        </button>
      </div>
    </article>
  );
}
