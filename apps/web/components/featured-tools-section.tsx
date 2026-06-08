"use client";

import { useTranslations } from "next-intl";
import { getFeaturedTools } from "@tool-platform/tool-sdk";
import { ToolCard } from "./tool-card";
import { ToolCardsWithVisits } from "./tool-visits";

export function FeaturedToolsSection() {
  const t = useTranslations("home");
  const featuredTools = getFeaturedTools();

  return (
    <section className="stat-card">
      <div className="section-header">
        <div>
          <h2>{t("quickTools")}</h2>
          <p>{t("quickToolsDescription")}</p>
        </div>
      </div>
      <div className="card-grid">
        <ToolCardsWithVisits>
          {(visits) =>
            featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} visitCount={visits.get(tool.id)} />
            ))
          }
        </ToolCardsWithVisits>
      </div>
    </section>
  );
}
