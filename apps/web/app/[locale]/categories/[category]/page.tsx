import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";

import { CommonToolsPage } from "@/components/common-tools";
import { SearchSurface } from "@/components/search-surface";
import { Topbar } from "@/components/topbar";
import { COMMON_TOOLS_CATEGORY_ID } from "@/lib/common-tools";
import { categories, getToolsByCategory, getAllTools, type ToolCategory, type ToolManifest } from "@tool-platform/tool-sdk";

export default async function CategoryPage({
  params
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const allTools = getAllTools();

  if (category === COMMON_TOOLS_CATEGORY_ID) {
    return <CommonToolsCategoryPage tools={allTools} />;
  }

  const meta = categories.find((item) => item.id === category);

  if (!meta) {
    notFound();
  }

  const tools = getToolsByCategory(allTools, meta.id);

  return <CategoryPageContent category={meta.id} tools={tools} />;
}

function CategoryPageContent({ category, tools }: { category: ToolCategory; tools: ReturnType<typeof getAllTools> }) {
  const ct = useTranslations("categories");
  const t = useTranslations("categoryPage");
  const label = ct(`${category}.label`);
  const description = ct(`${category}.description`);

  return (
    <>
      <Topbar title={label} subtitle={description} />
      <div className="content-stack">
        <SearchSurface
          tools={tools}
          title={t("filterTitle", { category: label })}
          subtitle={t("subtitle")}
          placeholder={t("searchPlaceholder", { category: label })}
          emptyTitle={tools.length > 0 ? t("emptyFiltered") : t("emptyCategory")}
          emptyDescription={
            tools.length > 0 ? t("emptyFilteredDescription") : t("emptyCategoryDescription")
          }
        />
      </div>
    </>
  );
}

function CommonToolsCategoryPage({ tools }: { tools: ToolManifest[] }) {
  const t = useTranslations("commonTools");

  return (
    <>
      <Topbar title={t("title")} subtitle={t("description")} />
      <CommonToolsPage tools={tools} />
    </>
  );
}
