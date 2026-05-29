import { useTranslations } from "next-intl";

import { categories, getAllTools, type ToolCategory } from "@tool-platform/tool-sdk";

import { Link } from "@/i18n/navigation";
import { LOCAL_TOOL_CATEGORY_COUNT } from "@/lib/common-tools";

const footerCategoryIds: ToolCategory[] = [
  "developer-tools",
  "text-tools",
  "data-tools",
  "design-tools",
  "security-tools",
  "ai-tools"
];

export function SiteFooter() {
  const t = useTranslations("siteFooter");
  const ct = useTranslations("categories");
  const tools = getAllTools();
  const featuredCategories = footerCategoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is (typeof categories)[number] => Boolean(c));
  const popularTools = tools
    .filter((tool) => tool.featured)
    .slice(0, 4);

  return (
    <footer className="site-footer" aria-label={t("ariaLabel")}>
      <div className="site-footer__content">
        <div className="site-footer__brand">
          <span className="pill">Tool Platform</span>
          <p>{t("description")}</p>
          <div className="site-footer__principles" aria-label={t("principles")}>
            <span className="tag">{t("localFirst")}</span>
            <span className="tag">{t("manifestDriven")}</span>
            <span className="tag">{t("workerReady")}</span>
          </div>
        </div>

        <div className="site-footer__nav">
          <nav className="site-footer__group" aria-label={t("explore")}>
            <h3>{t("explore")}</h3>
            <Link href="/">{t("home")}</Link>
            <Link href="/search">{t("search")}</Link>
          </nav>

          <nav className="site-footer__group" aria-label={t("categories")}>
            <h3>{t("categories")}</h3>
            {featuredCategories.map((category) => (
              <Link key={category.id} href={`/categories/${category.id}`}>
                {ct(`${category.id}.label`)}
              </Link>
            ))}
          </nav>

          {popularTools.length >= 2 && (
            <nav className="site-footer__group" aria-label={t("popularTools")}>
              <h3>{t("popularTools")}</h3>
              {popularTools.map((tool) => (
                <Link key={tool.id} href={`/tools/${tool.id}`}>
                  {tool.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>{t("summary", { tools: tools.length, categories: categories.length + LOCAL_TOOL_CATEGORY_COUNT })}</span>
        <span>{t("copyright", { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
