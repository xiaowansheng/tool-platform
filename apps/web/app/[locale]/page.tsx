import { useTranslations } from "next-intl";

import { CategoryPanel } from "@/components/category-panel";
import { FeaturedToolsSection } from "@/components/featured-tools-section";
import { Topbar } from "@/components/topbar";
import { categories, getAllTools } from "@tool-platform/tool-sdk";

export default function HomePage() {
  const t = useTranslations("home");
  const allTools = getAllTools();

  return (
    <>
      <Topbar title="Tool Platform" />
      <div className="content-stack">
        <section className="hero">
          <h2>{t("heroTitle")}</h2>
          <div className="hero__stats">
            <article className="stat-card">
              <strong>{allTools.length}</strong>
              <span>{t("statTools")}</span>
            </article>
            <article className="stat-card">
              <strong>{categories.length}</strong>
              <span>{t("statCategories")}</span>
            </article>
          </div>
        </section>

        <CategoryPanel />

        <FeaturedToolsSection />
      </div>
    </>
  );
}
