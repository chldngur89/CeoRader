import { ollama } from "@/lib/ai/ollama";
import {
  radarSearch,
  type RadarSearchDocument,
  type RadarSearchProvider,
  type RadarSearchResult,
} from "@/lib/search/radar-search";

export interface CompetitorNews {
  company: string;
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  provider: RadarSearchProvider;
  query: string;
  intent: string;
  score: number;
  isStale: boolean;
}

export interface CompetitorSignal {
  id: string;
  company: string;
  title: string;
  category: "opportunity" | "threat" | "trend";
  importance: number;
  time: string;
  description: string;
  source: string;
  link: string;
  evidence: CompetitorNews[];
}

type CompetitorAnalysis = {
  summary: string;
  signals: Array<{
    title?: string;
    category?: string;
    importance?: number;
    description?: string;
    sourceIndices?: number[];
  }>;
  watchouts: string[];
  opportunities: string[];
};

function formatRelativeTime(dateString: string): string {
  if (!dateString) return "최근";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "최근";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "방금";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function toCompetitorNews(company: string, doc: RadarSearchDocument): CompetitorNews {
  return {
    company,
    title: doc.title,
    link: doc.link,
    snippet: doc.snippet,
    date: doc.pubDate,
    source: doc.source,
    provider: doc.provider,
    query: doc.query,
    intent: doc.intent,
    score: doc.score,
    isStale: doc.isStale,
  };
}

function parseJsonFromText(rawText: string): CompetitorAnalysis | null {
  const candidates = [
    rawText.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1],
    rawText.match(/\{[\s\S]*\}/)?.[0],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        signals: Array.isArray(parsed.signals) ? parsed.signals : [],
        watchouts: Array.isArray(parsed.watchouts)
          ? parsed.watchouts.filter((item: unknown) => typeof item === "string")
          : [],
        opportunities: Array.isArray(parsed.opportunities)
          ? parsed.opportunities.filter((item: unknown) => typeof item === "string")
          : [],
      };
    } catch {
      continue;
    }
  }

  return null;
}

function fallbackAnalysis(company: string, news: CompetitorNews[]): CompetitorAnalysis {
  const topNews = news.slice(0, 3);

  return {
    summary:
      topNews.length > 0
        ? `${company} 관련 기사 ${topNews.length}건을 검색해 핵심 신호를 정리했습니다.`
        : `${company} 관련 최근 신호를 찾지 못했습니다.`,
    signals: topNews.map((item, index) => ({
      title: item.title,
      category: "trend",
      importance: 74 - index * 5,
      description: item.snippet || "검색된 기사 기반 신호입니다.",
      sourceIndices: [index + 1],
    })),
    watchouts:
      topNews.length > 0
        ? ["원문 링크를 열어 실제 가격/제품/제휴 변화인지 확인하세요."]
        : [],
    opportunities:
      topNews.length > 0
        ? ["상위 기사 3건을 주간 전략회의 입력값으로 사용하세요."]
        : [],
  };
}

function buildPrompt(company: string, news: CompetitorNews[]): string {
  return `당신은 CEO를 위한 경쟁사 인텔리전스 애널리스트입니다.
오늘 날짜: ${new Date().toISOString().slice(0, 10)}
경쟁사: ${company}

아래 검색 결과만 사용해서 분석하세요. 근거 없는 추정은 금지합니다.

${news
    .map(
      (item, index) => `[${index + 1}]
제목: ${item.title}
출처: ${item.source}
검색의도: ${item.intent}
검색쿼리: ${item.query}
게시시각: ${item.date || "알 수 없음"}
요약: ${item.snippet}
링크: ${item.link}`
    )
    .join("\n\n")}

반드시 JSON만 반환하세요.
{
  "summary": "2-3문장 요약",
  "signals": [
    {
      "title": "신호 제목",
      "category": "opportunity|threat|trend",
      "importance": 1,
      "description": "왜 중요한지",
      "sourceIndices": [1, 2]
    }
  ],
  "watchouts": ["주의 포인트"],
  "opportunities": ["활용 기회"]
}

규칙:
- signals는 최대 6개
- category는 opportunity, threat, trend 중 하나
- importance는 1~100 정수
- sourceIndices는 실제 근거 번호만 사용
- 가격, 제품, 마케팅, 파트너십, 채용, 확장 변화 같은 구체 신호를 우선하세요`;
}

function normalizeCategory(value: string | undefined) {
  if (value === "opportunity" || value === "threat" || value === "trend") {
    return value;
  }
  return "trend";
}

export async function fetchCompetitorNews(
  company: string,
  keywords: string[] = []
): Promise<{ search: RadarSearchResult; news: CompetitorNews[] }> {
  const search = await radarSearch({
    target: company,
    keywords,
    maxDocuments: 12,
  });

  return {
    search,
    news: search.documents.map((doc) => toCompetitorNews(company, doc)),
  };
}

export async function analyzeCompetitor(
  company: string,
  options?: { keywords?: string[] }
) {
  const { search, news } = await fetchCompetitorNews(company, options?.keywords ?? []);

  if (news.length === 0) {
    return {
      error: "No recent signals found",
      company,
      news: [],
      search: {
        engine: search.engine,
        providers: search.providers,
        queryCount: search.queries.length,
        freshness: search.freshness,
      },
    };
  }

  let analysis = fallbackAnalysis(company, news);

  try {
    const response = await ollama.generate({
      model: "llama3.1:latest",
      prompt: buildPrompt(company, news),
      options: {
        temperature: 0.2,
        num_predict: 1800,
      },
    });

    const parsed = parseJsonFromText(response.response);
    if (parsed) {
      analysis = {
        summary: parsed.summary || analysis.summary,
        signals: parsed.signals.length > 0 ? parsed.signals : analysis.signals,
        watchouts: parsed.watchouts.length > 0 ? parsed.watchouts : analysis.watchouts,
        opportunities:
          parsed.opportunities.length > 0 ? parsed.opportunities : analysis.opportunities,
      };
    }
  } catch (error) {
    console.warn("Competitor Ollama analysis failed, using fallback:", error);
  }

  const signals: CompetitorSignal[] = analysis.signals.slice(0, 6).map((signal, index) => {
    const evidence = (signal.sourceIndices || [])
      .map((sourceIndex) => news[sourceIndex - 1])
      .filter(Boolean)
      .slice(0, 3);

    const primaryEvidence = evidence[0] || news[index] || news[0];

    return {
      id: `${company}-${index}`,
      company,
      title: signal.title || primaryEvidence.title,
      category: normalizeCategory(signal.category),
      importance: Math.max(1, Math.min(100, Math.round(signal.importance || 70))),
      time: formatRelativeTime(primaryEvidence.date),
      description:
        signal.description || primaryEvidence.snippet || "최근 경쟁사 관련 신호입니다.",
      source: primaryEvidence.source,
      link: primaryEvidence.link,
      evidence: evidence.length > 0 ? evidence : [primaryEvidence],
    };
  });

  return {
    company,
    news,
    signals,
    watchouts: analysis.watchouts,
    opportunities: analysis.opportunities,
    analysis: {
      summary: analysis.summary,
      trends: signals.filter((signal) => signal.category === "trend").map((signal) => signal.title),
      threats: signals.filter((signal) => signal.category === "threat").map((signal) => signal.title),
      opportunities: signals
        .filter((signal) => signal.category === "opportunity")
        .map((signal) => signal.title),
    },
    search: {
      engine: search.engine,
      providers: search.providers,
      queryCount: search.queries.length,
      freshness: search.freshness,
    },
    timestamp: new Date().toISOString(),
  };
}
