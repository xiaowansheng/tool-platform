"use client";

import { useEffect, useState } from "react";
import { fetchCategoryRanking } from "@/lib/stats-client";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1) + "k";
  if (n < 1000000) return Math.round(n / 1000) + "k";
  return (n / 1000000).toFixed(1) + "M";
}

export function CategoryVisitCount({ categoryId, label }: { categoryId: string; label: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCategoryRanking(100).then((items) => {
      if (!mounted) return;
      for (const item of items) {
        if (item.categoryId === categoryId) {
          setCount(item.visitCount);
          return;
        }
      }
      setCount(0);
    });
    return () => { mounted = false; };
  }, [categoryId]);

  if (count === null) return null;

  return (
    <span className="category-visit-count">
      {label.replace("%c", formatCount(count))}
    </span>
  );
}
