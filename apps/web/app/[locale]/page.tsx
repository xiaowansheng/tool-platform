import { useTranslations } from "next-intl";

import { CategoryPanel } from "@/components/category-panel";
import { ToolCard } from "@/components/tool-card";
import { Topbar } from "@/components/topbar";
import { categories, getAllTools, getFeaturedTools } from "@tool-platform/tool-sdk";

export default function HomePage() {
  const t = useTranslations("home");
  const allTools = getAllTools();
  const featuredTools = getFeaturedTools();

  return (
    <>
      <Topbar title="Tool Platform" subtitle={t("subtitle")} />
      <div className="content-stack">
        <section className="hero">
          <span className="pill">Phase One</span>
          <h2>{t("heroTitle")}</h2>
          <p>{t("heroDescription")}</p>
          <div className="hero__stats">
            <article className="stat-card">
              <strong>{allTools.length}</strong>
              <span>{t("statTools")}</span>
            </article>
            <article className="stat-card">
              <strong>{categories.length}</strong>
              <span>{t("statCategories")}</span>
            </article>
            <article className="stat-card">
              <strong>{featuredTools.length}</strong>
              <span>{t("statFeatured")}</span>
            </article>
          </div>
        </section>

        <CategoryPanel />

        <section className="stat-card">
          <div className="section-header">
            <div>
              <h2>{t("quickTools")}</h2>
              <p>{t("quickToolsDescription")}</p>
            </div>
          </div>
          <div className="card-grid">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
