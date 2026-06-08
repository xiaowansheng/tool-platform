async function recordVisit(targetId: string): Promise<number> {
  try {
    const res = await fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId })
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.visitCount ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchSiteVisits(): Promise<number> {
  try {
    const res = await fetch("/api/stats?type=site");
    if (!res.ok) return 0;
    const data = await res.json();
    return data.visitCount ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchToolVisits(toolId: string): Promise<number> {
  try {
    const res = await fetch(`/api/stats?type=tool&toolId=${encodeURIComponent(toolId)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.visitCount ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchCategoryVisits(categoryId: string): Promise<number> {
  try {
    const res = await fetch(`/api/stats?type=category&categoryId=${encodeURIComponent(categoryId)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.visitCount ?? 0;
  } catch {
    return 0;
  }
}

export interface RankingItem {
  toolId: string;
  name: string;
  category: string;
  visitCount: number;
}

export interface CategoryRankingItem {
  categoryId: string;
  label: string;
  icon?: string;
  visitCount: number;
}

export async function fetchToolRanking(limit = 20): Promise<RankingItem[]> {
  try {
    const res = await fetch(`/api/stats/ranking?type=tool&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function fetchCategoryRanking(limit = 10): Promise<CategoryRankingItem[]> {
  try {
    const res = await fetch(`/api/stats/ranking?type=category&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

export function trackSiteVisit(): () => void {
  let recorded = false;

  if (typeof window !== "undefined") {
    const key = "_vs_site";
    if (sessionStorage.getItem(key)) {
      recorded = true;
    }
  }

  const doTrack = () => {
    if (recorded) return;
    recorded = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("_vs_site", "1");
    }
    recordVisit("site");
  };

  return doTrack;
}

export function trackToolVisit(toolId: string): () => void {
  let recorded = false;

  if (typeof window !== "undefined") {
    const key = `_vs_tool:${toolId}`;
    if (sessionStorage.getItem(key)) {
      recorded = true;
    }
  }

  const doTrack = () => {
    if (recorded) return;
    recorded = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`_vs_tool:${toolId}`, "1");
    }
    recordVisit(`tool:${toolId}`);
  };

  return doTrack;
}
