import { useTranslations } from "next-intl";

import { categories, getAllTools } from "@tool-platform/tool-sdk";

import { Link } from "@/i18n/navigation";


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
      <div className="detail-grid">
        {categories.map((category) => {
          const count = tools.filter((tool) => tool.category === category.id).length;

          return (
            <Link key={category.id} className="detail-card" href={`/categories/${category.id}`}>
              <div className="detail-card__icon">
                {category.icon ?? "·"}
              </div>
              <h3>{ct(`${category.id}.label`)}</h3>
              <p>{ct(`${category.id}.description`)}</p>
              <span className="pill">{count} tools</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
