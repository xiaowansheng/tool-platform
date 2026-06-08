"use client";

import { useTranslations } from "next-intl";

import { categories, getAllTools } from "@tool-platform/tool-sdk";

import { Link } from "@/i18n/navigation";
import { CategoryCardsWithVisits } from "./category-visits";

export function CategoryPanel() {
  const t = useTranslations("categoryPanel");
  const ct = useTranslations("categories");
  const tools = getAllTools();

  return (
    <section className="stat-card">
      <div className="section-header">
        <div>
          <h2>{t("title")}</h2>
        </div>
      </div>
      <div className="category-grid">
        <CategoryCardsWithVisits>
          {(visits) =>
            categories.map((category) => {
              const toolCount = tools.filter((tool) => tool.category === category.id).length;
              const visitCount = visits.get(category.id) ?? 0;

              return (
                <Link key={category.id} className="category-card" href={`/categories/${category.id}`}>
                  <span className="category-card__icon">{category.icon ?? "·"}</span>
                  <h3>{ct(`${category.id}.label`)}</h3>
                  <p title={ct(`${category.id}.description`)}>{ct(`${category.id}.description`)}</p>
                  <span className="category-card__count">{toolCount}</span>
                  <span className="category-card__visits">
                    {t("visitCount", { count: visitCount >= 1000 ? (visitCount / 1000).toFixed(1) + "k" : String(visitCount) })}
                  </span>
                  <span className="category-card__tooltip">{ct(`${category.id}.description`)}</span>
                </Link>
              );
            })
          }
        </CategoryCardsWithVisits>
      </div>
    </section>
  );
}
