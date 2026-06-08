"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { fetchToolRanking, fetchCategoryRanking, type RankingItem, type CategoryRankingItem } from "@/lib/stats-client";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1) + "k";
  if (n < 1000000) return Math.round(n / 1000) + "k";
  return (n / 1000000).toFixed(1) + "M";
}

function RankingSkeleton() {
  return (
    <div className="ranking-skeleton">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="ranking-skeleton__row">
          <div className="ranking-skeleton__rank" />
          <div className="ranking-skeleton__name" />
          <div className="ranking-skeleton__count" />
        </div>
      ))}
    </div>
  );
}

export function RankingPanel({
  toolTitle,
  categoryTitle,
  toolLimit = 20,
  categoryLimit = 10
}: {
  toolTitle: string;
  categoryTitle: string;
  toolLimit?: number;
  categoryLimit?: number;
}) {
  const [toolRanking, setToolRanking] = useState<RankingItem[] | null>(null);
  const [categoryRanking, setCategoryRanking] = useState<CategoryRankingItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchToolRanking(toolLimit),
      fetchCategoryRanking(categoryLimit)
    ]).then(([tools, cats]) => {
      if (mounted) {
        setToolRanking(tools);
        setCategoryRanking(cats);
      }
    });
    return () => { mounted = false; };
  }, [toolLimit, categoryLimit]);

  if (!toolRanking || !categoryRanking) {
    return (
      <section className="ranking-panel">
        <div className="ranking-panel__col">
          <h2>{toolTitle}</h2>
          <RankingSkeleton />
        </div>
        <div className="ranking-panel__col">
          <h2>{categoryTitle}</h2>
          <RankingSkeleton />
        </div>
      </section>
    );
  }

  return (
    <section className="ranking-panel">
      <div className="ranking-panel__col">
        <h2>{toolTitle}</h2>
        {toolRanking.length === 0 ? (
          <p className="ranking-panel__empty">No data yet</p>
        ) : (
          <ol className="ranking-list">
            {toolRanking.map((item, i) => (
              <li key={item.toolId} className="ranking-list__item">
                <span className={`ranking-list__rank ranking-list__rank--${i < 3 ? "top" : "normal"}`}>
                  {i + 1}
                </span>
                <Link href={`/tools/${item.toolId}`} className="ranking-list__name">
                  {item.name}
                </Link>
                <span className="ranking-list__count">{formatCount(item.visitCount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="ranking-panel__col">
        <h2>{categoryTitle}</h2>
        {categoryRanking.length === 0 ? (
          <p className="ranking-panel__empty">No data yet</p>
        ) : (
          <ol className="ranking-list">
            {categoryRanking.map((item, i) => (
              <li key={item.categoryId} className="ranking-list__item">
                <span className={`ranking-list__rank ranking-list__rank--${i < 3 ? "top" : "normal"}`}>
                  {i + 1}
                </span>
                <Link href={`/categories/${item.categoryId}`} className="ranking-list__name">
                  {item.label}
                </Link>
                <span className="ranking-list__count">{formatCount(item.visitCount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
