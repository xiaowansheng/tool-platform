import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";

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

  return <CategoryPageContent category={category} tools={tools} />;
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
