import { notFound } from "next/navigation";

import { ToolCard } from "@/components/tool-card";
import { Topbar } from "@/components/topbar";
import { getCategoryMeta, getToolsByCategory, getAllTools, type ToolCategory } from "@tool-platform/tool-sdk";

export default async function CategoryPage({
  params
}: {
  params: Promise<{ category: ToolCategory }>;
}) {
  const { category } = await params;
  const meta = getCategoryMeta(category);

  if (!meta) {
    notFound();
  }

  const tools = getToolsByCategory(getAllTools(), category);

  return (
    <>
      <Topbar title={meta.label} subtitle={meta.description} />
      <div className="content-stack">
        {tools.length > 0 ? (
          <section className="card-grid">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <strong>这个分类还没有落地工具</strong>
            <p>分类体系已经建立，后续工具接入后会自动进入当前目录和搜索索引。</p>
          </section>
        )}
      </div>
    </>
  );
}
