"use client";

import { useEffect, useState } from "react";
import { fetchCategoryRanking, type CategoryRankingItem } from "@/lib/stats-client";

export function CategoryCardsWithVisits({ children }: { children: (visits: Map<string, number>) => React.ReactNode }) {
  const [visits, setVisits] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCategoryRanking(100).then((items) => {
      if (!mounted) return;
      const map = new Map<string, number>();
      for (const item of items) {
        map.set(item.categoryId, item.visitCount);
      }
      setVisits(map);
    });
    return () => { mounted = false; };
  }, []);

  if (!visits) return children(new Map());

  return children(visits);
}
