import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompetitor, type CompetitorSignal } from '@/lib/crawler/competitor';

type CompetitorResponse = Awaited<ReturnType<typeof analyzeCompetitor>>;

function isSuccessfulResult(
  result: CompetitorResponse
): result is Exclude<CompetitorResponse, { error: string }> {
  return !("error" in result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const companies: string[] = Array.isArray(body.companies)
      ? body.companies.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    const keywords: string[] = Array.isArray(body.keywords)
      ? body.keywords.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    if (!company && companies.length === 0) {
      return NextResponse.json({ error: 'Company name required' }, { status: 400 });
    }

    if (companies.length > 0) {
      const targets = Array.from(new Set(companies)).slice(0, 3);
      const results: CompetitorResponse[] = [];

      for (const target of targets) {
        console.log('Analyzing competitor:', target);
        results.push(await analyzeCompetitor(target, { keywords }));
      }

      const successfulResults = results.filter(isSuccessfulResult);
      const aggregatedSignals: CompetitorSignal[] = [];

      for (const result of successfulResults) {
        aggregatedSignals.push(...result.signals);
      }

      return NextResponse.json({
        success: true,
        engine: "radar-search",
        companies: targets,
        results,
        signals: aggregatedSignals
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 12),
        timestamp: new Date().toISOString(),
      });
    }

    console.log('Analyzing competitor:', company);

    const result = await analyzeCompetitor(company, { keywords });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Competitor analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
