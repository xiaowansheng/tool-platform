import { NextRequest, NextResponse } from "next/server";
import {
  incrementVisit,
  getVisitCount,
  getAllToolVisits
} from "@/lib/stats-db";

const DEDUP_WINDOW_MS = 5 * 60 * 1000;

const sessionDedup = new Map<string, Map<string, number>>();

const MAX_SESSION_CACHE = 5000;

function pruneDedupCache() {
  if (sessionDedup.size > MAX_SESSION_CACHE) {
    const keys = Array.from(sessionDedup.keys());
    const toRemove = keys.slice(0, Math.floor(keys.length / 2));
    for (const key of toRemove) {
      sessionDedup.delete(key);
    }
  }
}

function getSessionId(request: NextRequest): string {
  let sessionId = request.cookies.get("_vs_s")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

function isDupInWindow(sessionId: string, targetId: string): boolean {
  const targets = sessionDedup.get(sessionId);
  if (!targets) return false;
  const lastHit = targets.get(targetId);
  if (!lastHit) return false;
  return Date.now() - lastHit < DEDUP_WINDOW_MS;
}

function markVisit(sessionId: string, targetId: string) {
  let targets = sessionDedup.get(sessionId);
  if (!targets) {
    targets = new Map();
    sessionDedup.set(sessionId, targets);
    pruneDedupCache();
  }
  targets.set(targetId, Date.now());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetId } = body as { targetId?: string };

    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json(
        { error: "targetId is required" },
        { status: 400 }
      );
    }

    if (
      !targetId.startsWith("tool:") &&
      targetId !== "site" &&
      !targetId.startsWith("category:")
    ) {
      return NextResponse.json(
        { error: "invalid targetId format" },
        { status: 400 }
      );
    }

    const sessionId = getSessionId(request);

    if (isDupInWindow(sessionId, targetId)) {
      const count = getVisitCount(targetId);
      const response = NextResponse.json({ visitCount: count });
      return response;
    }

    markVisit(sessionId, targetId);

    const count = incrementVisit(targetId);

    const response = NextResponse.json({ visitCount: count });
    response.cookies.set("_vs_s", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "invalid request" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  switch (type) {
    case "site": {
      const count = getVisitCount("site");
      return NextResponse.json({ visitCount: count });
    }

    case "tool": {
      const toolId = searchParams.get("toolId");
      if (!toolId) {
        return NextResponse.json(
          { error: "toolId is required" },
          { status: 400 }
        );
      }
      const count = getVisitCount(`tool:${toolId}`);
      return NextResponse.json({ visitCount: count });
    }

    case "category": {
      const categoryId = searchParams.get("categoryId");
      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId is required" },
          { status: 400 }
        );
      }
      return NextResponse.json({ categoryId, visitCount: 0 });
    }

    default:
      return NextResponse.json(
        { error: "type must be one of: site, tool, category" },
        { status: 400 }
      );
  }
}
