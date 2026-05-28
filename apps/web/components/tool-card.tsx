import Link from "next/link";

import { getCategoryMeta, type ToolManifest } from "@tool-platform/tool-sdk";

const TOOL_CARD_VISIBLE_TAGS = 4;

export function ToolCard({ tool }: { tool: ToolManifest }) {
  const category = getCategoryMeta(tool.category);
  const visibleTags = tool.tags.slice(0, TOOL_CARD_VISIBLE_TAGS);
  const hiddenTagCount = tool.tags.length - visibleTags.length;
  const tagSummary = tool.tags.join(", ");

  return (
    <article className="tool-card">
      <div className="tool-card__header">
        <div className="tool-card__title-group">
          <p className="eyebrow">{category?.label ?? tool.category}</p>
          <h3 title={tool.name}>{tool.name}</h3>
        </div>
        <span className="pill pill--runtime" data-runtime={tool.runtime}>
          {tool.runtime}
        </span>
      </div>
      <p className="tool-card__description" title={tool.description}>
        {tool.description}
      </p>
      <div className="tag-list" role="list" aria-label={"标签：" + tagSummary} title={tagSummary}>
        {visibleTags.map((tag) => (
          <span key={tag} className="tag" role="listitem">
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 ? (
          <span className="tag tag--more" role="listitem" aria-label={"还有 " + hiddenTagCount + " 个标签"}>
            +{hiddenTagCount}
          </span>
        ) : null}
      </div>
      <Link className="button-link button-link--accent" href={"/tools/" + tool.id}>
        进入工具
      </Link>
    </article>
  );
}
