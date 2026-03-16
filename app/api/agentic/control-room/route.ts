import { NextRequest, NextResponse } from "next/server";

import { buildAgenticControlRoom } from "@/lib/agentic/control-room";
import type { TrackedCompany } from "@/lib/app/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTrackedCompanies(value: unknown): TrackedCompany[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `tracked-${index + 1}`,
      name: typeof item.name === "string" ? item.name.trim() : "",
      website: typeof item.website === "string" ? item.website.trim() : "",
    }))
    .filter((item) => item.name.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const trackedCompanies = parseTrackedCompanies(body.trackedCompanies);
    const ownCompanyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    const ownCompanyWebsite = typeof body.companyWebsite === "string" ? body.companyWebsite.trim() : "";

    const combined = [
      ...(ownCompanyName && ownCompanyWebsite
        ? [
            {
              id: "own-company",
              name: ownCompanyName,
              website: ownCompanyWebsite,
            },
          ]
        : []),
      ...trackedCompanies,
    ];

    const response = await buildAgenticControlRoom(combined);
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to load control room",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
