import { NextRequest, NextResponse } from "next/server";
import { getTopTools, getAllToolVisits } from "@/lib/stats-db";
import { getAllTools, categories } from "@tool-platform/tool-sdk";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const rawLimit = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(rawLimit || "20", 10) || 20, 1), 100);

    if (type === "tool") {
      const topTools = getTopTools(limit);
      const allTools = getAllTools();
      const toolMap = new Map(allTools.map((t) => [t.id, t]));

      const result = topTools
        .filter((t) => toolMap.has(t.toolId))
        .map((t) => {
          const tool = toolMap.get(t.toolId)!;
          return {
            toolId: t.toolId,
            name: tool.name,
            category: tool.category,
            visitCount: t.visitCount
          };
        });

      return NextResponse.json({ items: result });
    }

    if (type === "category") {
      const allToolVisits = getAllToolVisits();
      const allTools = getAllTools();
      const toolMap = new Map(allTools.map((t) => [t.id, t]));
      const categorySums = new Map<string, number>();

      for (const { toolId, visitCount } of allToolVisits) {
        const tool = toolMap.get(toolId);
        if (!tool) continue;
        const current = categorySums.get(tool.category) || 0;
        categorySums.set(tool.category, current + visitCount);
      }

      const sorted = Array.from(categorySums.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([categoryId, visitCount]) => {
          const meta = categories.find((c) => c.id === categoryId);
          return {
            categoryId,
            label: meta?.label || categoryId,
            icon: meta?.icon,
            visitCount
          };
        });

      return NextResponse.json({ items: sorted });
    }

    return NextResponse.json(
      { error: "type must be one of: tool, category" },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json({ items: [] });
  }
}
