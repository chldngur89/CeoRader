import { NextRequest, NextResponse } from "next/server";

import { runAgenticRadar } from "@/lib/agentic/radar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackedCompanyInput = {
  id?: string;
  name: string;
  website: string;
};

function parseTrackedCompanies(value: unknown): TrackedCompanyInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : undefined,
      name: typeof item.name === "string" ? item.name : "",
      website: typeof item.website === "string" ? item.website : "",
    }))
    .filter((item) => item.name.trim().length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const trackedCompanies = parseTrackedCompanies(body.trackedCompanies);

    const result = await runAgenticRadar({
      trackedCompanies,
      context: {
        companyName: typeof body.companyName === "string" ? body.companyName : undefined,
        companyWebsite: typeof body.companyWebsite === "string" ? body.companyWebsite : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
        goals: Array.isArray(body.goals)
          ? body.goals.filter((item: unknown): item is string => typeof item === "string")
          : [],
        keywords: Array.isArray(body.keywords)
          ? body.keywords.filter((item: unknown): item is string => typeof item === "string")
          : [],
      },
      sourceLimit:
        typeof body.sourceLimit === "number" && body.sourceLimit > 0
          ? Math.min(body.sourceLimit, 6)
          : 4,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Agentic radar failed",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
