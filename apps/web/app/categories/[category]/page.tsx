import { notFound } from "next/navigation";

import { SearchSurface } from "@/components/search-surface";
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
        <SearchSurface
          tools={tools}
          title={"筛选" + meta.label}
          subtitle="在当前分类内按工具名、标签、运行时或描述缩小列表。"
          placeholder={"在" + meta.label + "中搜索名称、标签或运行时"}
          emptyTitle={tools.length > 0 ? "没有命中当前筛选" : "这个分类还没有落地工具"}
          emptyDescription={
            tools.length > 0
              ? "换一个关键词试试，例如工具名称、标签或运行时类型。"
              : "分类体系已经建立，后续工具接入后会自动进入当前目录和搜索索引。"
          }
        />
      </div>
    </>
  );
}
