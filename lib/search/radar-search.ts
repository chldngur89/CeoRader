import { rssCrawler, type NewsArticle } from "@/lib/crawler/rss";

export type RadarSearchProvider = "google-news" | "naver-news";
export type RadarSearchIntent =
  | "general"
  | "adoption"
  | "product"
  | "pricing"
  | "marketing"
  | "partnership"
  | "hiring"
  | "expansion"
  | "regulation"
  | "infrastructure";

export interface RadarSearchQuery {
  query: string;
  provider: RadarSearchProvider;
  intent: RadarSearchIntent;
  weight: number;
}

export interface RadarSearchDocument {
  id: string;
  title: string;
  link: string;
  snippet: string;
  pubDate: string;
  source: string;
  provider: RadarSearchProvider;
  query: string;
  intent: RadarSearchIntent;
  score: number;
  freshnessScore: number;
  intentScore: number;
  keywordScore: number;
  ageDays: number | null;
  isStale: boolean;
}

export interface RadarSearchResult {
  engine: "radar-search";
  target: string;
  queries: RadarSearchQuery[];
  documents: RadarSearchDocument[];
  providers: RadarSearchProvider[];
  freshness: "recent" | "stale";
}

type SearchParams = {
  target: string;
  keywords?: string[];
  maxDocuments?: number;
  maxAgeDays?: number;
  intents?: RadarSearchIntent[];
  queryLimit?: number;
  providers?: RadarSearchProvider[];
};

const RECENT_MAX_AGE_DAYS = 45;

function normalizeText(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeKey(text: string): string {
  return normalizeText(text).toLowerCase();
}

function quoteTarget(target: string): string {
  return target.includes(" ") ? `"${target}"` : target;
}

function daysSince(pubDate: string): number | null {
  const ts = new Date(pubDate).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}

function getFreshnessScore(pubDate: string): number {
  const ageDays = daysSince(pubDate);
  if (ageDays === null) return 8;
  if (ageDays <= 1) return 45;
  if (ageDays <= 3) return 36;
  if (ageDays <= 7) return 28;
  if (ageDays <= 14) return 18;
  if (ageDays <= 30) return 10;
  if (ageDays <= 45) return 4;
  return -10;
}

function getIntentLexicon(intent: RadarSearchIntent): string[] {
  switch (intent) {
    case "adoption":
      return ["도입", "전환", "생산성", "enterprise", "현장"];
    case "product":
      return ["출시", "서비스", "솔루션", "기능", "제품"];
    case "pricing":
      return ["가격", "요금", "인상", "할인", "수수료"];
    case "marketing":
      return ["마케팅", "캠페인", "브랜드", "광고", "프로모션"];
    case "partnership":
      return ["제휴", "파트너십", "협약", "협력", "투자"];
    case "hiring":
      return ["채용", "영입", "인재", "조직", "팀"];
    case "expansion":
      return ["확장", "진출", "오픈", "신설", "거점"];
    case "regulation":
      return ["규제", "법", "법안", "윤리", "보안"];
    case "infrastructure":
      return ["gpu", "반도체", "데이터센터", "클라우드", "인프라"];
    default:
      return ["전략", "사업", "서비스"];
  }
}

function inferIntentFromKeyword(keyword: string): RadarSearchIntent {
  const normalized = keyword.toLowerCase();

  if (["hiring", "hire", "채용", "영입", "talent", "인재"].some((token) => normalized.includes(token))) {
    return "hiring";
  }

  if (
    ["price", "pricing", "plan", "요금", "가격", "플랜", "구독"].some((token) =>
      normalized.includes(token)
    )
  ) {
    return "pricing";
  }

  if (
    ["launch", "release", "product", "feature", "model", "에이전트", "출시", "기능", "모델"].some(
      (token) => normalized.includes(token)
    )
  ) {
    return "product";
  }

  if (["partner", "partnership", "integration", "제휴", "협력", "통합"].some((token) => normalized.includes(token))) {
    return "partnership";
  }

  if (
    ["regulation", "security", "compliance", "규제", "보안", "법", "privacy"].some((token) =>
      normalized.includes(token)
    )
  ) {
    return "regulation";
  }

  if (
    ["gpu", "infra", "infrastructure", "compute", "반도체", "클라우드", "데이터센터"].some(
      (token) => normalized.includes(token)
    )
  ) {
    return "infrastructure";
  }

  if (["adoption", "enterprise", "roi", "도입", "운영"].some((token) => normalized.includes(token))) {
    return "adoption";
  }

  return "general";
}

function getIntentScore(
  title: string,
  snippet: string,
  intent: RadarSearchIntent
): number {
  const text = `${title} ${snippet}`.toLowerCase();
  return getIntentLexicon(intent).reduce(
    (score, token) => score + (text.includes(token.toLowerCase()) ? 6 : 0),
    0
  );
}

function getKeywordScore(
  title: string,
  snippet: string,
  target: string,
  keywords: string[]
): number {
  const text = `${title} ${snippet}`.toLowerCase();
  const tokens = [target, ...keywords]
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  return tokens.reduce((score, token) => score + (text.includes(token) ? 10 : 0), 0);
}

function isLowSignalArticle(article: NewsArticle): boolean {
  const text = `${article.title} ${article.description}`.toLowerCase();
  return [
    "주가",
    "장마감",
    "장중",
    "vi 발동",
    "특징주",
    "오늘의 ir",
    "공시",
    "시황",
    "급등",
    "급락",
    "목표주가",
    "수혜주",
  ].some((pattern) => text.includes(pattern));
}

function buildQueryPlan(
  target: string,
  keywords: string[] = [],
  options?: Pick<SearchParams, "intents" | "queryLimit" | "providers">
): RadarSearchQuery[] {
  const exactTarget = quoteTarget(target);
  const allowedIntents = options?.intents ? new Set(options.intents) : null;
  const allowedProviders = options?.providers ? new Set(options.providers) : null;
  const keywordQueries = keywords
    .slice(0, 6)
    .flatMap((keyword) => {
      const intent = inferIntentFromKeyword(keyword);
      const provider = "google-news" as const;

      if (allowedIntents && !allowedIntents.has(intent) && !allowedIntents.has("general")) {
        return [];
      }

      if (allowedProviders && !allowedProviders.has(provider)) {
        return [];
      }

      return [
        {
          query: `${exactTarget} ${keyword}`,
          provider,
          intent,
          weight: intent === "general" ? 1.05 : 1.2,
        },
      ];
    });

  const baseQueries: Omit<RadarSearchQuery, "provider">[] = [
    { query: `${exactTarget} 도입`, intent: "adoption", weight: 1.2 },
    { query: `${exactTarget} enterprise`, intent: "adoption", weight: 1.1 },
    { query: `${exactTarget} 서비스`, intent: "product", weight: 1.2 },
    { query: `${exactTarget} 플랫폼`, intent: "product", weight: 1.1 },
    { query: `${exactTarget} 에이전트`, intent: "product", weight: 1.1 },
    { query: `${exactTarget} 출시`, intent: "product", weight: 1.1 },
    { query: `${exactTarget} 모델`, intent: "product", weight: 1.05 },
    { query: `${exactTarget} 요금`, intent: "pricing", weight: 1.0 },
    { query: `${exactTarget} 마케팅`, intent: "marketing", weight: 0.9 },
    { query: `${exactTarget} 제휴`, intent: "partnership", weight: 1.0 },
    { query: `${exactTarget} partnership`, intent: "partnership", weight: 0.95 },
    { query: `${exactTarget} 규제`, intent: "regulation", weight: 1.0 },
    { query: `${exactTarget} GPU`, intent: "infrastructure", weight: 1.0 },
    { query: `${exactTarget} 채용`, intent: "hiring", weight: 0.8 },
    { query: `${exactTarget} hiring`, intent: "hiring", weight: 0.85 },
    { query: `${exactTarget} 영입`, intent: "hiring", weight: 0.8 },
    { query: `${exactTarget} 조직`, intent: "hiring", weight: 0.75 },
    { query: `${exactTarget} 확장`, intent: "expansion", weight: 0.9 },
    { query: exactTarget, intent: "general", weight: 0.8 },
  ];

  const googleQueries = baseQueries
    .slice(0, 14)
    .map((item) => ({ ...item, provider: "google-news" as const }));
  const naverQueries = baseQueries
    .slice(0, 7)
    .map((item) => ({ ...item, provider: "naver-news" as const }));
  const plannedQueries = [...googleQueries, ...naverQueries, ...keywordQueries]
    .filter((item) => (allowedIntents ? allowedIntents.has(item.intent) : true))
    .filter((item) => (allowedProviders ? allowedProviders.has(item.provider) : true));

  return dedupeQueries(plannedQueries).slice(0, options?.queryLimit ?? 16);
}

function dedupeQueries(queries: RadarSearchQuery[]): RadarSearchQuery[] {
  const seen = new Set<string>();

  return queries.filter((item) => {
    const key = `${item.provider}:${item.query}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runQuery(query: RadarSearchQuery): Promise<NewsArticle[]> {
  if (query.provider === "naver-news") {
    return rssCrawler.fetchNaverNews(query.query);
  }

  return rssCrawler.fetchGoogleNews(query.query);
}

function scoreDocument(
  article: NewsArticle,
  query: RadarSearchQuery,
  target: string,
  keywords: string[]
): RadarSearchDocument {
  const title = normalizeText(article.title);
  const snippet = normalizeText(article.description).slice(0, 260);
  const freshnessScore = getFreshnessScore(article.pubDate);
  const intentScore = getIntentScore(title, snippet, query.intent);
  const keywordScore = getKeywordScore(title, snippet, target, keywords);
  const score =
    freshnessScore + intentScore + keywordScore + Math.round(query.weight * 12);
  const ageDays = daysSince(article.pubDate);

  return {
    id: `${query.provider}:${normalizeKey(title)}:${normalizeKey(article.source)}`,
    title,
    link: article.link,
    snippet,
    pubDate: article.pubDate,
    source: article.source,
    provider: query.provider,
    query: query.query,
    intent: query.intent,
    score,
    freshnessScore,
    intentScore,
    keywordScore,
    ageDays,
    isStale: ageDays !== null && ageDays > RECENT_MAX_AGE_DAYS,
  };
}

function dedupeDocuments(documents: RadarSearchDocument[]): RadarSearchDocument[] {
  const bestByKey = new Map<string, RadarSearchDocument>();

  for (const doc of documents) {
    const key = `${normalizeKey(doc.title)}|${normalizeKey(doc.source)}`;
    const current = bestByKey.get(key);
    if (!current || doc.score > current.score) {
      bestByKey.set(key, doc);
    }
  }

  return Array.from(bestByKey.values());
}

export async function radarSearch({
  target,
  keywords = [],
  maxDocuments = 12,
  maxAgeDays = RECENT_MAX_AGE_DAYS,
  intents,
  queryLimit,
  providers,
}: SearchParams): Promise<RadarSearchResult> {
  const queries = buildQueryPlan(target, keywords, {
    intents,
    queryLimit,
    providers,
  });
  const batches = await Promise.all(
    queries.map(async (query) => ({
      query,
      articles: await runQuery(query),
    }))
  );

  const documents = dedupeDocuments(
    batches.flatMap(({ query, articles }) =>
      articles
        .filter((article) => !isLowSignalArticle(article))
        .map((article) => scoreDocument(article, query, target, keywords))
    )
  ).sort((a, b) => b.score - a.score);

  const recentDocuments = documents.filter(
    (doc) => doc.ageDays === null || doc.ageDays <= maxAgeDays
  );
  const selectedDocuments =
    (recentDocuments.length > 0 ? recentDocuments : documents).slice(0, maxDocuments);

  return {
    engine: "radar-search",
    target,
    queries,
    documents: selectedDocuments,
    providers: Array.from(new Set(selectedDocuments.map((doc) => doc.provider))),
    freshness: recentDocuments.length > 0 ? "recent" : "stale",
  };
}
