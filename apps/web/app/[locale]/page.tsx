import { useTranslations } from "next-intl";

import { CategoryPanel } from "@/components/category-panel";
import { FeaturedToolsSection } from "@/components/featured-tools-section";
import { RankingPanel } from "@/components/ranking-panel";
import { Topbar } from "@/components/topbar";
import { LOCAL_TOOL_CATEGORY_COUNT } from "@/lib/common-tools";
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
              <strong>{categories.length + LOCAL_TOOL_CATEGORY_COUNT}</strong>
              <span>{t("statCategories")}</span>
            </article>
            <article className="stat-card">
              <strong>{featuredTools.length}</strong>
              <span>{t("statFeatured")}</span>
            </article>
          </div>
        </section>

        <CategoryPanel />

        <FeaturedToolsSection />

        <RankingPanel
          toolTitle={t("topTools")}
          categoryTitle={t("topCategories")}
          toolLimit={30}
          categoryLimit={10}
        />
      </div>
    </>
  );
}
