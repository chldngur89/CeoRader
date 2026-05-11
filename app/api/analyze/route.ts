import { NextRequest, NextResponse } from "next/server";

import { buildTopicBrief } from "@/lib/analysis/topic-brief";
import { ollama } from "@/lib/ai/ollama";
import { getClientId } from "@/lib/http/client-ip";
import { jsonError } from "@/lib/http/json-error";
import { analyzeLimitPerMinute, checkRateLimit } from "@/lib/http/rate-limit";
import { analyzePostBodySchema } from "@/lib/validation/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const clientId = getClientId(req);
  const rl = checkRateLimit(`analyze:${clientId}`, analyzeLimitPerMinute(), WINDOW_MS);
  if (!rl.ok) {
    return jsonError(429, "RATE_LIMIT", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "JSON 바디가 필요합니다.");
  }

  const parsed = analyzePostBodySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
      ? Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .filter(Boolean)[0] || parsed.error.message
      : parsed.error.message;
    return jsonError(400, "VALIDATION_ERROR", msg);
  }

  const body = parsed.data;

  try {
    const result = await buildTopicBrief({
      topic: body.topic.trim(),
      description: body.description.trim(),
      keywords: body.keywords,
      companyName: body.companyName.trim(),
      companyWebsite: body.companyWebsite.trim(),
      trackedCompanies: body.trackedCompanies.map((item) => ({
        id: item.id,
        name: item.name,
        website: item.website,
      })),
      sourceLimit:
        typeof body.sourceLimit === "number" && body.sourceLimit > 0
          ? Math.min(body.sourceLimit, 4)
          : 3,
    });

    const topic = body.topic.trim();
    return NextResponse.json({
      success: true,
      topic,
      analysis: result.analysis,
      sources: result.sources,
      useRealData: result.useRealData,
      timestamp: result.analysis.generatedAt,
    });
  } catch (error) {
    console.error("[api/analyze]", error);
    return jsonError(500, "ANALYSIS_FAILED", (error as Error).message || "분석에 실패했습니다.");
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
