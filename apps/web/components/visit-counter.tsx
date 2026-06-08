"use client";

import { useEffect, useState } from "react";
import { fetchSiteVisits, fetchToolVisits } from "@/lib/stats-client";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1) + "k";
  if (n < 1000000) return Math.round(n / 1000) + "k";
  return (n / 1000000).toFixed(1) + "M";
}

export function SiteVisitCount({ label }: { label: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchSiteVisits().then((c) => {
      if (mounted) setCount(c);
    });
    return () => { mounted = false; };
  }, []);

  if (count === null) return null;

  return (
    <span className="visit-count">
      {label.replace("%c", formatCount(count))}
    </span>
  );
}

export function ToolVisitCount({ toolId, label }: { toolId: string; label: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchToolVisits(toolId).then((c) => {
      if (mounted) setCount(c);
    });
    return () => { mounted = false; };
  }, [toolId]);

  if (count === null) return null;

  return (
    <span className="visit-count">
      {label.replace("%c", formatCount(count))}
    </span>
  );
}
