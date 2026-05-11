import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { AGENTIC_ROOT, readJsonFile } from "@/lib/agentic/storage";
import type { AgenticScanResult } from "@/lib/agentic/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUN_DIR = path.join(AGENTIC_ROOT, "runs");

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get("entityId")?.trim() || "";
  const runId = req.nextUrl.searchParams.get("runId")?.trim() || "";

  if (!entityId || !runId) {
    return NextResponse.json({ error: "entityId and runId required" }, { status: 400 });
  }

  const payload = await readJsonFile<AgenticScanResult>(path.join(RUN_DIR, entityId, `${runId}.json`));
  if (!payload) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    run: payload,
  });
}
