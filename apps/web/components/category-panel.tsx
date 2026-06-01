import { useTranslations } from "next-intl";

import { categories, getAllTools } from "@tool-platform/tool-sdk";

import { Link } from "@/i18n/navigation";
import { CommonToolsCategoryCard, FavoriteToolsCategoryCard } from "./common-tools";


export function CategoryPanel() {
  const t = useTranslations("categoryPanel");
  const ct = useTranslations("categories");
  const tools = getAllTools();

  return (
    <section className="stat-card">
      <div className="section-header">
        <div>
          <h2>{t("title")}</h2>
          <p>{t("description")}</p>
        </div>
      </div>
      <div className="category-grid">
        <CommonToolsCategoryCard />
        <FavoriteToolsCategoryCard />
        {categories.map((category) => {
          const count = tools.filter((tool) => tool.category === category.id).length;

          return (
            <Link key={category.id} className="category-card" href={`/categories/${category.id}`}>
              <span className="category-card__icon">{category.icon ?? "·"}</span>
              <h3>{ct(`${category.id}.label`)}</h3>
              <p title={ct(`${category.id}.description`)}>{ct(`${category.id}.description`)}</p>
              <span className="category-card__count">{count}</span>
              <span className="category-card__tooltip">{ct(`${category.id}.description`)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
