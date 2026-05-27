import Link from "next/link";

import { getCategoryMeta, type ToolManifest } from "@tool-platform/tool-sdk";

export function ToolCard({ tool }: { tool: ToolManifest }) {
  const category = getCategoryMeta(tool.category);

  return (
    <article className="tool-card">
      <div className="tool-card__header">
        <div>
          <p className="eyebrow">{category?.label ?? tool.category}</p>
          <h3>{tool.name}</h3>
        </div>
        <span className="pill">{tool.runtime}</span>
      </div>
      <p>{tool.description}</p>
      <div className="tag-list">
        {tool.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
      <Link className="button-link" href={`/tools/${tool.id}`}>
        进入工具
      </Link>
    </article>
  );
}
