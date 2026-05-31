import { useLocale, useTranslations } from "next-intl";

import { getCategoryMeta, type ToolManifest } from "@tool-platform/tool-sdk";

import { Link } from "@/i18n/navigation";
import { getRuntimeLabel, getToolPageManifest } from "@/lib/tool-page-copy";

const TOOL_CARD_VISIBLE_TAGS = 4;

export function ToolCard({ tool }: { tool: ToolManifest }) {
  const t = useTranslations("toolCard");
  const locale = useLocale();
  const displayTool = getToolPageManifest(tool, locale);
  const runtimeLabel = getRuntimeLabel(tool.runtime, locale);
  const ct = useTranslations("categories");
  const category = getCategoryMeta(tool.category);
  const visibleTags = tool.tags.slice(0, TOOL_CARD_VISIBLE_TAGS);
  const hiddenTagCount = tool.tags.length - visibleTags.length;
  const tagSummary = tool.tags.join(", ");
  const categoryLabel = category ? ct(`${category.id}.label`) : tool.category;

  return (
    <article className="tool-card">
      <div className="tool-card__header">
        <div className="tool-card__title-group">
          <p className="eyebrow">{categoryLabel}</p>
          <h3 title={displayTool.name}>{displayTool.name}</h3>
        </div>
        <span className="pill pill--runtime" data-runtime={tool.runtime}>
          {runtimeLabel}
        </span>
      </div>
      <p className="tool-card__description" title={displayTool.description}>
        {displayTool.description}
      </p>
      <div className="tag-list" role="list" aria-label={t("tagsLabel", { tags: tagSummary })} title={tagSummary}>
        {visibleTags.map((tag) => (
          <span key={tag} className="tag" role="listitem">
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 ? (
          <span className="tag tag--more" role="listitem" aria-label={t("moreTags", { count: hiddenTagCount })}>
            +{hiddenTagCount}
          </span>
        ) : null}
      </div>
      <Link className="button-link button-link--accent" href={"/tools/" + tool.id}>
        {t("enterTool")}
      </Link>
    </article>
  );
}
