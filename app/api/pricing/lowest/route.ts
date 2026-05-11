import { NextRequest, NextResponse } from "next/server";

import { getClientId } from "@/lib/http/client-ip";
import { jsonError } from "@/lib/http/json-error";
import { checkRateLimit, pricingLimitPerMinute } from "@/lib/http/rate-limit";
import type { PricingLowestResponse } from "@/lib/pricing/lowest-price-types";
import { pricingLowestBodySchema } from "@/lib/validation/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;

function upstreamBase() {
  return (process.env.LOWEST_ALERT_API_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");
}

function upstreamTimeoutMs() {
  const n = Number(process.env.PRICING_UPSTREAM_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 3000 ? Math.min(n, 120_000) : 15_000;
}

export async function POST(req: NextRequest) {
  const clientId = getClientId(req);
  const rl = checkRateLimit(`pricing:${clientId}`, pricingLimitPerMinute(), WINDOW_MS);
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

  const parsed = pricingLowestBodySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] || parsed.error.message;
    return jsonError(400, "VALIDATION_ERROR", msg);
  }

  const body = parsed.data;

  try {
    const base = upstreamBase();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), upstreamTimeoutMs());
    const upstream = await fetch(`${base}/api/pricing/lowest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: body.productName?.trim() || undefined,
        productUrl: body.productUrl?.trim() || undefined,
        category: body.category?.trim() || undefined,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);

    const text = await upstream.text();
    let payload: PricingLowestResponse;
    try {
      payload = JSON.parse(text) as PricingLowestResponse;
    } catch {
      return jsonError(502, "UPSTREAM_BAD_JSON", "최저가 서버 응답이 올바르지 않습니다.");
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error: payload.error || `lowestAlert HTTP ${upstream.status}`,
        },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return jsonError(504, "UPSTREAM_TIMEOUT", "최저가 서버 응답 시간이 초과되었습니다.");
    }
    const message = e instanceof Error ? e.message : "Pricing proxy failed";
    return jsonError(500, "PRICING_PROXY_ERROR", message);
  }
}
