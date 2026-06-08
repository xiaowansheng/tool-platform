"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAllTools } from "@tool-platform/tool-sdk";
import { fetchToolRanking, type RankingItem } from "@/lib/stats-client";
import { ToolCard } from "./tool-card";

export function FeaturedToolsSection() {
  const t = useTranslations("home");
  const [ranking, setRanking] = useState<RankingItem[] | null>(null);
  const allTools = getAllTools();
  const toolMap = new Map(allTools.map((t) => [t.id, t]));

  useEffect(() => {
    let mounted = true;
    fetchToolRanking(20).then((items) => {
      if (mounted) setRanking(items);
    });
    return () => { mounted = false; };
  }, []);

  const tools =
    ranking
      ? ranking
          .filter((item) => toolMap.has(item.toolId))
          .map((item) => ({
            tool: toolMap.get(item.toolId)!,
            visitCount: item.visitCount
          }))
      : [];

  return (
    <section className="stat-card">
      <div className="section-header">
        <div>
          <h2>{t("quickTools")}</h2>
        </div>
      </div>
      <div className="card-grid">
        {tools.length > 0 ? (
          tools.map(({ tool, visitCount }) => (
            <ToolCard key={tool.id} tool={tool} visitCount={visitCount} />
          ))
        ) : (
          allTools
            .filter((t) => t.featured)
            .slice(0, 12)
            .map((tool) => (
              <ToolCard key={tool.id} tool={tool} visitCount={0} />
            ))
        )}
      </div>
    </section>
  );
}
