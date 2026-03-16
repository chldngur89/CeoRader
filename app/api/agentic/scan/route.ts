import { NextRequest, NextResponse } from "next/server";

import { runAgenticScan } from "@/lib/agentic/scan";
import type { ManualTrackedSourceInput } from "@/lib/agentic/source-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseManualSources(value: unknown): ManualTrackedSourceInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      type: typeof item.type === "string" ? (item.type as ManualTrackedSourceInput["type"]) : undefined,
      label: typeof item.label === "string" ? item.label : undefined,
      url: typeof item.url === "string" ? item.url : "",
      priority: typeof item.priority === "number" ? item.priority : undefined,
      isActive: typeof item.isActive === "boolean" ? item.isActive : undefined,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
    }))
    .filter((item) => item.url.trim().length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const website = typeof body.website === "string" ? body.website.trim() : undefined;
    const sourceLimit =
      typeof body.sourceLimit === "number" && body.sourceLimit > 0
        ? Math.min(body.sourceLimit, 12)
        : 6;
    const includeDefaults = body.includeDefaults !== false;
    const manualSources = parseManualSources(body.manualSources);

    if (!company) {
      return NextResponse.json({ error: "Company name required" }, { status: 400 });
    }

    const result = await runAgenticScan({
      company,
      website,
      includeDefaults,
      manualSources,
      sourceLimit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Agentic scan failed",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
