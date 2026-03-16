import {
  radarSearch,
  type RadarSearchDocument,
  type RadarSearchIntent,
} from "@/lib/search/radar-search";
import { runAgenticRadar, type AgenticRadarSignal } from "@/lib/agentic/radar";
import type {
  TopicBriefAction,
  TopicBriefAnalysis,
  TopicBriefEvidence,
  TopicBriefInsight,
  TopicBriefLens,
  TopicBriefOfficialSignal,
} from "@/lib/app/topic-brief";

type BuildTopicBriefParams = {
  topic: string;
  description?: string;
  keywords?: string[];
  companyName?: string;
  companyWebsite?: string;
  trackedCompanies?: Array<{
    id?: string;
    name: string;
    website: string;
  }>;
  sourceLimit?: number;
};

type TopicBriefResult = {
  analysis: TopicBriefAnalysis;
  sources: Array<{
    title: string;
    link: string;
    source: string;
    pubDate: string;
  }>;
  useRealData: boolean;
};

const MEMORY_CACHE = new Map<
  string,
  {
    value: TopicBriefResult;
    expiresAt: number;
  }
>();

const DEFAULT_TTL_MS =
  typeof process !== "undefined" && process.env.TOPIC_BRIEF_TTL_MS
    ? Number(process.env.TOPIC_BRIEF_TTL_MS)
    : 10 * 60 * 1000;

const NOISE_PATTERNS = [
  "특징주",
  "주가",
  "급등",
  "급락",
  "목표주가",
  "수혜주",
  "장마감",
  "장중",
  "vi 발동",
  "공시",
  "시황",
  "매매동향",
  "증권가",
  "실적발표",
  "투자의견",
];

const LENS_ORDER: TopicBriefLens[] = [
  "infrastructure",
  "adoption",
  "competition",
  "regulation",
  "talent",
];

const LENS_LABELS: Record<TopicBriefLens, string> = {
  adoption: "도입 전환",
  competition: "경쟁 구도",
  infrastructure: "인프라/원가",
  regulation: "규제/리스크",
  talent: "인재/조직",
};

const LENS_KEYWORDS: Record<TopicBriefLens, string[]> = {
  adoption: [
    "도입",
    "enterprise",
    "기업",
    "생산성",
    "업무",
    "roi",
    "현장",
    "전환",
  ],
  competition: [
    "출시",
    "서비스",
    "제품",
    "모델",
    "에이전트",
    "agent",
    "플랫폼",
    "제휴",
    "파트너십",
  ],
  infrastructure: [
    "gpu",
    "칩",
    "반도체",
    "데이터센터",
    "compute",
    "인프라",
    "클라우드",
    "전력",
  ],
  regulation: [
    "규제",
    "법",
    "법안",
    "ai act",
    "윤리",
    "privacy",
    "보안",
    "compliance",
  ],
  talent: [
    "채용",
    "영입",
    "인재",
    "조직",
    "팀",
    "교육",
    "skill",
    "upskilling",
  ],
};

const DEFAULT_KEYWORDS = {
  AI: [
    "enterprise AI",
    "AI agents",
    "GPU",
    "AI regulation",
    "AI adoption",
    "AI hiring",
    "AI security",
    "AI model launch",
    "AI partnership",
  ],
};

const TOPIC_ENTITY_TARGETS: Record<string, string[]> = {
  ai: ["OpenAI", "Anthropic", "Google", "Microsoft", "Meta"],
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function topicKeywords(topic: string, keywords: string[]) {
  const defaultKeywords =
    topic.trim().toLowerCase() === "ai" ? DEFAULT_KEYWORDS.AI : [];

  return Array.from(new Set([...keywords, ...defaultKeywords])).filter(Boolean);
}

function normalizeTrackedCompanies(
  trackedCompanies: BuildTopicBriefParams["trackedCompanies"] = []
) {
  return trackedCompanies
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      website: item.website.trim(),
    }))
    .filter((item) => item.name.length > 0 && item.website.length > 0);
}

function normalizeDocumentKey(document: Pick<RadarSearchDocument, "title" | "source">) {
  return `${normalizeText(document.title).toLowerCase()}|${normalizeText(document.source).toLowerCase()}`;
}

function mergeDocuments(searches: Array<{ documents: RadarSearchDocument[] }>) {
  const byKey = new Map<string, RadarSearchDocument>();

  for (const search of searches) {
    for (const document of search.documents) {
      const key = normalizeDocumentKey(document);
      const current = byKey.get(key);
      if (!current || document.score > current.score) {
        byKey.set(key, document);
      }
    }
  }

  return Array.from(byKey.values()).sort((left, right) => right.score - left.score);
}

function buildEntityTargets(
  topic: string,
  trackedCompanies: Array<{ name: string }>
) {
  const defaults = TOPIC_ENTITY_TARGETS[topic.trim().toLowerCase()] ?? [];

  return Array.from(
    new Set([...trackedCompanies.map((item) => item.name), ...defaults].filter(Boolean))
  ).slice(0, 5);
}

function combinedText(document: RadarSearchDocument) {
  return `${document.title} ${document.snippet}`.toLowerCase();
}

function isNoise(document: RadarSearchDocument) {
  const text = combinedText(document);
  return NOISE_PATTERNS.some((pattern) => text.includes(pattern.toLowerCase()));
}

function lensFromIntent(intent: RadarSearchIntent): TopicBriefLens | null {
  switch (intent) {
    case "adoption":
      return "adoption";
    case "infrastructure":
      return "infrastructure";
    case "regulation":
      return "regulation";
    case "hiring":
      return "talent";
    case "product":
    case "pricing":
    case "partnership":
      return "competition";
    case "marketing":
    case "expansion":
      return "adoption";
    default:
      return null;
  }
}

function inferLens(document: RadarSearchDocument): TopicBriefLens {
  const byIntent = lensFromIntent(document.intent);
  if (byIntent) {
    return byIntent;
  }

  const text = combinedText(document);
  const scores = LENS_ORDER.map((lens) => ({
    lens,
    score: LENS_KEYWORDS[lens].reduce(
      (sum, keyword) => sum + (text.includes(keyword.toLowerCase()) ? 1 : 0),
      0
    ),
  })).sort((left, right) => right.score - left.score);

  return scores[0]?.score > 0 ? scores[0].lens : "competition";
}

function whyRelevant(lens: TopicBriefLens, document: RadarSearchDocument) {
  switch (lens) {
    case "infrastructure":
      return "원가와 서비스 품질에 직접 연결되는 인프라 신호입니다.";
    case "adoption":
      return "고객 예산이 실험에서 운영 단계로 넘어가는지 보여줍니다.";
    case "regulation":
      return "제품 출시와 영업 리스크에 바로 연결되는 규제 신호입니다.";
    case "talent":
      return "향후 제품 투자와 실행 역량 변화를 보여주는 조직 신호입니다.";
    default:
      return `${document.source}에서 포착된 경쟁/제품 변화 신호입니다.`;
  }
}

function confidenceForEvidence(document: RadarSearchDocument) {
  let score = 55;
  if (document.ageDays !== null && document.ageDays <= 3) score += 20;
  else if (document.ageDays !== null && document.ageDays <= 7) score += 12;
  else if (document.ageDays !== null && document.ageDays <= 14) score += 6;
  if (document.score >= 80) score += 12;
  else if (document.score >= 60) score += 8;
  return Math.max(1, Math.min(95, score));
}

function buildEvidence(document: RadarSearchDocument, lens: TopicBriefLens): TopicBriefEvidence {
  return {
    id: document.id,
    title: document.title,
    source: document.source,
    link: document.link,
    pubDate: document.pubDate,
    lens,
    summary: normalizeText(document.snippet).slice(0, 180),
    whyRelevant: whyRelevant(lens, document),
    score: confidenceForEvidence(document),
    kind: "news",
  };
}

function lensFromOfficialSignal(signal: AgenticRadarSignal): TopicBriefLens {
  if (signal.changeTypes.includes("hiring") || signal.sourceType === "careers") {
    return "talent";
  }

  if (
    signal.changeTypes.includes("product") ||
    signal.changeTypes.includes("pricing") ||
    signal.changeTypes.includes("partnership") ||
    signal.changeTypes.includes("messaging")
  ) {
    return "competition";
  }

  return signal.category === "opportunity" ? "adoption" : "competition";
}

function buildOfficialSignal(signal: AgenticRadarSignal): TopicBriefOfficialSignal {
  return {
    id: signal.id,
    company: signal.company,
    title: signal.title,
    summary: signal.description,
    link: signal.link,
    source: signal.source,
    sourceType: signal.sourceType,
    changeTypes: signal.changeTypes,
    recommendation: signal.recommendation,
    importance: signal.importance,
    status: signal.status,
    structured: signal.structured,
  };
}

function buildSiteEvidence(signal: AgenticRadarSignal, timestamp: string): TopicBriefEvidence {
  const lens = lensFromOfficialSignal(signal);

  return {
    id: `site-${signal.id}`,
    title: signal.title,
    source: `${signal.company} · ${signal.source}`,
    link: signal.link,
    pubDate: timestamp,
    lens,
    summary: signal.description,
    whyRelevant: signal.recommendation,
    score: signal.importance,
    kind: "site-change",
    company: signal.company,
    sourceType: signal.sourceType,
    changeTypes: signal.changeTypes,
    status: signal.status,
    structured: signal.structured,
  };
}

function insightTemplate(topic: string, lens: TopicBriefLens, evidence: TopicBriefEvidence[]) {
  const first = evidence[0];
  const second = evidence[1];

  switch (lens) {
    case "infrastructure":
      return {
        title: `${topic} 인프라와 원가 경쟁이 심해지고 있습니다`,
        summary: `${first?.title || "최근 기사"}를 보면 GPU, 데이터센터, 클라우드 자원 확보가 계속 경쟁 포인트가 되고 있습니다.`,
        whyItMatters:
          "AI 서비스는 성능보다 먼저 원가와 납기에서 차이가 벌어질 수 있습니다. CEO는 단가 가정과 공급 제약을 다시 봐야 합니다.",
        priority: "high" as const,
      };
    case "adoption":
      return {
        title: `${topic}는 실험이 아니라 운영 예산의 문제로 이동 중입니다`,
        summary: `${first?.title || "최근 기사"}${second ? `, ${second.title}` : ""} 흐름을 보면 기업 도입이 실제 업무 적용 단계로 움직이고 있습니다.`,
        whyItMatters:
          "제품 메시지는 기술 자체보다 ROI, 보안, 운영 연결성으로 옮겨가야 합니다.",
        priority: "high" as const,
      };
    case "regulation":
      return {
        title: `${topic} 시장에서 규제와 보안 대응이 제품 요건이 되고 있습니다`,
        summary: `${first?.title || "최근 기사"}는 규제, 윤리, 보안 요구가 시장 진입 조건으로 바뀌고 있음을 보여줍니다.`,
        whyItMatters:
          "규제 대응이 늦으면 영업 사이클이 길어지고 엔터프라이즈 계약에서 밀릴 수 있습니다.",
        priority: "high" as const,
      };
    case "talent":
      return {
        title: `${topic} 경쟁은 제품보다 팀 역량에서 먼저 벌어지고 있습니다`,
        summary: `${first?.title || "최근 기사"} 기준으로 채용과 교육 움직임이 계속 나오고 있습니다.`,
        whyItMatters:
          "핵심 인재와 현장 도입 역량이 없으면 제품 속도보다 운영 실패가 먼저 옵니다.",
        priority: "medium" as const,
      };
    default:
      return {
        title: `${topic} 경쟁 구도가 빠르게 재편되고 있습니다`,
        summary: `${first?.title || "최근 기사"}${second ? `, ${second.title}` : ""}에서 제품, 제휴, 플랫폼 포지셔닝 변화가 보입니다.`,
        whyItMatters:
          "경쟁사 카피, 패키징, 제휴 관계가 바뀌면 우리 포지셔닝과 세일즈 스크립트도 같이 바뀌어야 합니다.",
        priority: "high" as const,
      };
  }
}

function buildInsight(topic: string, lens: TopicBriefLens, evidence: TopicBriefEvidence[]): TopicBriefInsight {
  const template = insightTemplate(topic, lens, evidence);
  const avgConfidence =
    evidence.length > 0
      ? Math.round(evidence.reduce((sum, item) => sum + item.score, 0) / evidence.length)
      : 50;

  return {
    id: `${lens}-${evidence[0]?.id || topic}`,
    lens,
    title: template.title,
    summary: template.summary,
    whyItMatters: template.whyItMatters,
    priority: template.priority,
    confidence: avgConfidence,
    evidenceIds: evidence.map((item) => item.id),
  };
}

function actionForInsight(insight: TopicBriefInsight): TopicBriefAction {
  switch (insight.lens) {
    case "infrastructure":
      return {
        id: `action-${insight.id}`,
        title: "모델 원가와 추론 단가 가정을 다시 계산하세요",
        owner: "CEO",
        horizon: "30d",
        priority: "high",
        rationale: "GPU와 인프라 신호는 매출보다 먼저 마진 구조를 흔듭니다.",
      };
    case "adoption":
      return {
        id: `action-${insight.id}`,
        title: "고객 제안서를 ROI와 운영 연결성 중심으로 다시 쓰세요",
        owner: "Sales",
        horizon: "now",
        priority: "high",
        rationale: "도입 단계가 운영으로 넘어가면 기술 설명보다 구매 설득 구조가 중요합니다.",
      };
    case "regulation":
      return {
        id: `action-${insight.id}`,
        title: "보안·컴플라이언스 체크리스트를 제품 요구사항에 넣으세요",
        owner: "Product",
        horizon: "30d",
        priority: "high",
        rationale: "규제 대응은 영업 후반이 아니라 제품 설계 초반에 반영되어야 합니다.",
      };
    case "talent":
      return {
        id: `action-${insight.id}`,
        title: "핵심 채용과 내부 업스킬링 우선순위를 정리하세요",
        owner: "Ops",
        horizon: "90d",
        priority: "medium",
        rationale: "도입 속도는 기능 수보다 팀 역량의 병목에 더 자주 걸립니다.",
      };
    default:
      return {
        id: `action-${insight.id}`,
        title: "경쟁사 메시지와 제휴 변화를 세일즈 스크립트에 반영하세요",
        owner: "Sales",
        horizon: "now",
        priority: "high",
        rationale: "경쟁사 포지셔닝 변화는 시장 카테고리 정의를 바꿀 수 있습니다.",
      };
  }
}

function buildSummary(
  topic: string,
  insights: TopicBriefInsight[],
  description?: string,
  officialSignals: TopicBriefOfficialSignal[] = []
) {
  if (insights.length === 0) {
    return `${topic} 시장에서 의미 있는 근거를 아직 충분히 모으지 못했습니다. 검색 범위나 키워드를 더 좁혀야 합니다.`;
  }

  const first = insights[0];
  const second = insights[1];
  const companyContext = description ? ` ${description}` : "";
  const changedOfficialSignals = officialSignals.filter((item) => item.status === "changed").length;
  const officialContext =
    changedOfficialSignals > 0
      ? ` 공식 사이트에서도 ${changedOfficialSignals}건의 실질 변화가 확인됐습니다.`
      : "";

  return `${topic} 시장은 지금 ${LENS_LABELS[first.lens]} 중심으로 움직이고 있습니다.${second ? ` 동시에 ${LENS_LABELS[second.lens]} 이슈도 커지고 있습니다.` : ""}${officialContext}${companyContext} 기준으로는 이 흐름을 제품 메시지, 원가 구조, 엔터프라이즈 영업 우선순위에 바로 연결해야 합니다.`;
}

function buildWatchouts(
  topic: string,
  filteredNoiseCount: number,
  curatedDocuments: RadarSearchDocument[],
  insights: TopicBriefInsight[],
  officialSignals: TopicBriefOfficialSignal[],
  trackedCompanies: Array<{ name: string; website: string }>
) {
  const watchouts: string[] = [];

  const staleDocuments = curatedDocuments.filter((item) => item.isStale).length;
  if (staleDocuments > 0) {
    watchouts.push(`근거 중 ${staleDocuments}건은 오래된 기사입니다. ${topic} 주제는 신선도 검증이 더 필요합니다.`);
  }

  if (filteredNoiseCount > 0) {
    watchouts.push(`주가·특징주성 기사 ${filteredNoiseCount}건을 제외했습니다. broad topic일수록 노이즈 억제가 중요합니다.`);
  }

  const missingLenses = LENS_ORDER.filter((lens) => !insights.some((item) => item.lens === lens));
  if (missingLenses.length > 0) {
    watchouts.push(`아직 ${missingLenses.map((item) => LENS_LABELS[item]).join(", ")} 관점 근거가 약합니다.`);
  }

  if (trackedCompanies.length === 0) {
    watchouts.push("공식 사이트 추적 회사가 없어서 뉴스 근거 위주로 브리프가 생성됐습니다.");
  } else if (officialSignals.length === 0) {
    watchouts.push("공식 사이트 기준으로는 아직 변화가 감지되지 않았습니다. 기준선만 확보됐을 수 있습니다.");
  }

  return watchouts.slice(0, 4);
}

function diversifyDocuments(documents: RadarSearchDocument[]) {
  const grouped = new Map<TopicBriefLens, RadarSearchDocument[]>();

  for (const document of documents.sort((left, right) => right.score - left.score)) {
    const lens = inferLens(document);
    grouped.set(lens, [...(grouped.get(lens) || []), document]);
  }

  const selection: RadarSearchDocument[] = [];

  for (let round = 0; round < 4; round += 1) {
    for (const lens of LENS_ORDER) {
      const candidate = grouped.get(lens)?.[round];
      if (candidate) {
        selection.push(candidate);
      }
    }
  }

  return selection.slice(0, 18);
}

export async function buildTopicBrief({
  topic,
  description,
  keywords = [],
  companyName,
  companyWebsite,
  trackedCompanies = [],
  sourceLimit = 3,
}: BuildTopicBriefParams): Promise<TopicBriefResult> {
  const normalizedTrackedCompanies = normalizeTrackedCompanies(trackedCompanies);
  const effectiveKeywords = topicKeywords(topic, keywords);
  const entityTargets = buildEntityTargets(topic, normalizedTrackedCompanies);

  const cacheKey = JSON.stringify({
    topic: topic.trim().toLowerCase(),
    description: description?.trim() || "",
    keywords: effectiveKeywords,
    companyName: companyName?.trim() || "",
    companyWebsite: companyWebsite?.trim() || "",
    trackedCompanies: normalizedTrackedCompanies.map((item) => ({
      name: item.name,
      website: item.website,
    })),
    sourceLimit,
  });

  const now = Date.now();
  const cached = MEMORY_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const searches = await Promise.all([
    radarSearch({
      target: topic,
      keywords: effectiveKeywords,
      maxDocuments: 24,
      maxAgeDays: 30,
      queryLimit: 18,
    }),
    radarSearch({
      target: topic,
      keywords: effectiveKeywords,
      maxDocuments: 8,
      maxAgeDays: 30,
      intents: ["product", "pricing", "partnership"],
      queryLimit: 8,
    }),
    radarSearch({
      target: topic,
      keywords: effectiveKeywords,
      maxDocuments: 8,
      maxAgeDays: 30,
      intents: ["hiring"],
      queryLimit: 6,
    }),
    ...entityTargets.map((entity) =>
      radarSearch({
        target: entity,
        keywords: [topic, ...effectiveKeywords.slice(0, 4)],
        maxDocuments: 6,
        maxAgeDays: 30,
        intents: ["product", "pricing", "partnership", "hiring"],
        queryLimit: 10,
        providers: ["google-news"],
      })
    ),
  ]);

  const allDocuments = mergeDocuments(searches);
  const filteredDocuments = allDocuments.filter((document) => !isNoise(document));
  const filteredNoiseCount = allDocuments.length - filteredDocuments.length;
  const curatedDocuments = diversifyDocuments(filteredDocuments);
  const documentsForUse = curatedDocuments.length > 0 ? curatedDocuments : allDocuments.slice(0, 12);
  const radar =
    normalizedTrackedCompanies.length > 0
      ? await runAgenticRadar({
          trackedCompanies: normalizedTrackedCompanies,
          context: {
            companyName,
            companyWebsite,
            description,
            keywords: effectiveKeywords,
          },
          sourceLimit: Math.min(Math.max(1, sourceLimit), 4),
        })
      : null;
  const officialSignals = (radar?.signals || []).map(buildOfficialSignal);
  const changedSiteEvidence = (radar?.signals || [])
    .filter((signal) => signal.status === "changed")
    .map((signal) => buildSiteEvidence(signal, radar?.timestamp || new Date().toISOString()));

  const evidenceByLens = new Map<TopicBriefLens, TopicBriefEvidence[]>();

  for (const document of documentsForUse) {
    const lens = inferLens(document);
    const evidence = buildEvidence(document, lens);
    evidenceByLens.set(lens, [...(evidenceByLens.get(lens) || []), evidence]);
  }

  for (const evidence of changedSiteEvidence) {
    evidenceByLens.set(evidence.lens, [...(evidenceByLens.get(evidence.lens) || []), evidence]);
  }

  const insights = LENS_ORDER
    .map((lens) => {
      const evidence = (evidenceByLens.get(lens) || [])
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);
      return evidence.length > 0 ? buildInsight(topic, lens, evidence) : null;
    })
    .filter((item): item is TopicBriefInsight => !!item)
    .slice(0, 5);

  const selectedEvidenceIds = new Set(insights.flatMap((insight) => insight.evidenceIds));
  const evidence = Array.from(evidenceByLens.values())
    .flat()
    .filter((item) => selectedEvidenceIds.has(item.id))
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);

  const actions = insights
    .map((insight) => actionForInsight(insight))
    .slice(0, 4);

  const analysis: TopicBriefAnalysis = {
    topic,
    summary: buildSummary(topic, insights, description, officialSignals),
    insights,
    actions,
    evidence,
    officialSignals: officialSignals.slice(0, 8),
    watchouts: buildWatchouts(
      topic,
      filteredNoiseCount,
      documentsForUse,
      insights,
      officialSignals,
      normalizedTrackedCompanies
    ),
    metrics: {
      totalDocuments: allDocuments.length,
      curatedDocuments: documentsForUse.length,
      staleDocuments: documentsForUse.filter((item) => item.isStale).length,
      officialSignals: officialSignals.length,
      changedOfficialSignals: officialSignals.filter((item) => item.status === "changed").length,
      trackedCompaniesScanned: radar?.overview.scannedCompanies || 0,
    },
    events: insights.map((insight) => ({
      title: insight.title,
      description: insight.summary,
      impact: insight.priority,
    })),
    generatedAt: new Date().toISOString(),
    engine: "radar-search",
  };
  const result: TopicBriefResult = {
    analysis,
    sources: evidence.map((item) => ({
      title: item.title,
      link: item.link,
      source: item.source,
      pubDate: item.pubDate,
    })),
    useRealData: allDocuments.length > 0,
  };

  const ttl = Number.isFinite(DEFAULT_TTL_MS) && DEFAULT_TTL_MS > 0 ? DEFAULT_TTL_MS : 10 * 60 * 1000;
  MEMORY_CACHE.set(cacheKey, {
    value: result,
    expiresAt: now + ttl,
  });

  return result;
}
