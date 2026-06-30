import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { CommonToolsPage, FavoriteToolsPage } from "@/components/common-tools";
import { SearchSurface } from "@/components/search-surface";
import { Topbar } from "@/components/topbar";
import { CategoryVisitCount } from "@/components/category-visit-count";
import { COMMON_TOOLS_CATEGORY_ID, FAVORITE_TOOLS_CATEGORY_ID } from "@/lib/common-tools";
import { buildPageMetadata, buildCategoryJsonLd } from "@/lib/seo-metadata";
import { categories, getToolsByCategory, getAllTools, type ToolCategory, type ToolManifest } from "@tool-platform/tool-sdk";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const ct = await getTranslations({ locale, namespace: "categories" });

  if (category === COMMON_TOOLS_CATEGORY_ID) {
    const t = await getTranslations({ locale, namespace: "commonTools" });
    return buildPageMetadata({
      title: t("title"),
      description: t("description"),
      locale,
      path: `/${locale}/categories/${category}`,
    });
  }

  if (category === FAVORITE_TOOLS_CATEGORY_ID) {
    const t = await getTranslations({ locale, namespace: "favoriteTools" });
    return buildPageMetadata({
      title: t("title"),
      description: t("description"),
      locale,
      path: `/${locale}/categories/${category}`,
    });
  }

  const meta = categories.find((item) => item.id === category);
  if (!meta) {
    return { title: "Category Not Found" };
  }

  return buildPageMetadata({
    title: ct(`${category}.label`),
    description: ct(`${category}.description`),
    locale,
    path: `/${locale}/categories/${category}`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  const allTools = getAllTools();

  if (category === COMMON_TOOLS_CATEGORY_ID) {
    return <CommonToolsCategoryPage tools={allTools} />;
  }

  if (category === FAVORITE_TOOLS_CATEGORY_ID) {
    return <FavoriteToolsCategoryPage tools={allTools} />;
  }

  const meta = categories.find((item) => item.id === category);

  if (!meta) {
    notFound();
  }

  const tools = getToolsByCategory(allTools, meta.id);
  const ct = await getTranslations({ locale, namespace: "categories" });
  const label = ct(`${meta.id}.label`);
  const description = ct(`${meta.id}.description`);
  const jsonLd = buildCategoryJsonLd(label, description, locale, meta.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoryPageContent category={meta.id} tools={tools} />
    </>
  );
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
        <CategoryVisitCount
          categoryId={category}
          label={t("visitCount")}
        />
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


function FavoriteToolsCategoryPage({ tools }: { tools: ToolManifest[] }) {
  const t = useTranslations("favoriteTools");

  return (
    <>
      <Topbar title={t("title")} subtitle={t("description")} />
      <FavoriteToolsPage tools={tools} />
    </>
  );
}
