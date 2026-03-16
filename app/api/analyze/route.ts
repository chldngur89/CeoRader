import { NextRequest, NextResponse } from "next/server";

import { buildTopicBrief } from "@/lib/analysis/topic-brief";
import { ollama } from "@/lib/ai/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const keywords = Array.isArray(body.keywords)
      ? body.keywords.filter((item: unknown): item is string => typeof item === "string")
      : [];
    const trackedCompanies = Array.isArray(body.trackedCompanies)
      ? body.trackedCompanies
          .filter((item: unknown): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item: Record<string, unknown>) => ({
            id: typeof item.id === "string" ? item.id : undefined,
            name: typeof item.name === "string" ? item.name : "",
            website: typeof item.website === "string" ? item.website : "",
          }))
      : [];

    if (!topic) {
      return NextResponse.json({ error: "Topic required" }, { status: 400 });
    }

    const result = await buildTopicBrief({
      topic,
      description,
      keywords,
      companyName: typeof body.companyName === "string" ? body.companyName.trim() : "",
      companyWebsite: typeof body.companyWebsite === "string" ? body.companyWebsite.trim() : "",
      trackedCompanies,
      sourceLimit:
        typeof body.sourceLimit === "number" && body.sourceLimit > 0
          ? Math.min(body.sourceLimit, 4)
          : 3,
    });

    return NextResponse.json({
      success: true,
      topic,
      analysis: result.analysis,
      sources: result.sources,
      useRealData: result.useRealData,
      timestamp: result.analysis.generatedAt,
    });
  } catch (error) {
    console.error("Topic brief error:", error);
    return NextResponse.json(
      { error: "Analysis failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const healthy = await ollama.checkHealth();
  const models = healthy ? await ollama.listModels() : [];

  return NextResponse.json({
    status: healthy ? "ok" : "warning",
    ollama: healthy,
    models,
    engine: "radar-search",
    message: healthy
      ? "Local topic brief engine ready"
      : "Topic brief works without Ollama, but local model refinement is unavailable",
  });
}
