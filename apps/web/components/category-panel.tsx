import Link from "next/link";

import { categories, getAllTools } from "@tool-platform/tool-sdk";

const categoryIcons: Record<string, string> = {
  developer: "</>",
  ai: "✦",
  text: "Aa",
  image: "◇",
  video: "▶",
  file: "☰",
  network: "◉",
  ops: "⌘",
  design: "◎",
  productivity: "⚡"
};

export function CategoryPanel() {
  const tools = getAllTools();

  return (
    <section className="stat-card">
      <div className="section-header">
        <div>
          <h2>分类入口</h2>
          <p>按文档中的推荐分类组织工具，并保留未来扩展空间。</p>
        </div>
      </div>
      <div className="detail-grid">
        {categories.map((category) => {
          const count = tools.filter((tool) => tool.category === category.id).length;

          return (
            <Link key={category.id} className="detail-card" href={`/categories/${category.id}`}>
              <div className="detail-card__icon">
                {categoryIcons[category.id] ?? "·"}
              </div>
              <h3>{category.label}</h3>
              <p>{category.description}</p>
              <span className="pill">{count} tools</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
