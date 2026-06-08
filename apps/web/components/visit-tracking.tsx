"use client";

import { useEffect, useRef } from "react";
import { trackSiteVisit, trackToolVisit } from "@/lib/stats-client";

export function SiteVisitTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const doTrack = trackSiteVisit();
    const timer = setTimeout(doTrack, 800);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

export function ToolVisitTracker({ toolId }: { toolId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const doTrack = trackToolVisit(toolId);
    const timer = setTimeout(doTrack, 800);
    return () => clearTimeout(timer);
  }, [toolId]);

  return null;
}
