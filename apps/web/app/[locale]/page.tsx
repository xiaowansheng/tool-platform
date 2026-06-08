import { useTranslations } from "next-intl";

import { RankingPanel } from "@/components/ranking-panel";
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
          <span className="pill">Phase One</span>
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

        <RankingPanel
          toolTitle={t("topTools")}
          categoryTitle={t("topCategories")}
          toolLimit={20}
          categoryLimit={10}
        />
      </div>
    </>
  );
}
