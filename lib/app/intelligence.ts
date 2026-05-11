import type { StructuredChangeSet } from "@/lib/app/structured-change";

export type IntelligenceSourceKind = "news" | "site-change";
export type ExtractedFactKind =
  | "pricing"
  | "messaging"
  | "hiring"
  | "partnership"
  | "product";

export interface ExtractedFact {
  id: string;
  kind: ExtractedFactKind;
  company: string;
  sourceType: string;
  sourceKind: IntelligenceSourceKind;
  value: string;
  beforeValue?: string;
  afterValue?: string;
  confidence: number;
  evidenceIds: string[];
  occurredAt: string;
}

export interface CorrelatedEventEvidence {
  id: string;
  title: string;
  kind: IntelligenceSourceKind;
  source: string;
  link: string;
  pubDate: string;
}

export interface CorrelatedEvent {
  id: string;
  company: string;
  title: string;
  summary: string;
  changeTypes: ExtractedFactKind[];
  evidenceIds: string[];
  importance: number;
  confidence: number;
  recommendedAction?: string;
  occurredAt: string;
  evidenceCount: number;
  sourceKinds: IntelligenceSourceKind[];
  facts: ExtractedFact[];
  evidence: CorrelatedEventEvidence[];
}

type SiteEvidenceInput = {
  id: string;
  company: string;
  sourceType: string;
  title: string;
  summary: string;
  source: string;
  link: string;
  pubDate: string;
  changeTypes: string[];
  structured?: StructuredChangeSet;
  added?: string[];
  removed?: string[];
};

type NewsEvidenceInput = {
  id: string;
  company: string;
  title: string;
  summary: string;
  source: string;
  link: string;
  pubDate: string;
  intent?: string;
};

type CorrelateParams = {
  company: string;
  facts: ExtractedFact[];
  evidenceById: Map<string, CorrelatedEventEvidence>;
  keywords?: string[];
  goals?: string[];
};

function clamp(value: number, min = 1, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeKey(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueBy<T>(items: T[], toKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = toKey(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function tokenize(text: string) {
  return normalizeKey(text)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function tokenSimilarity(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...Array.from(leftTokens), ...Array.from(rightTokens)]).size || 1;
  return intersection / union;
}

function daysBetween(left: string, right: string) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return 0;
  }
  return Math.abs(leftTime - rightTime) / 86400000;
}

function changeTypeSeverity(kind: ExtractedFactKind) {
  switch (kind) {
    case "pricing":
      return 28;
    case "product":
      return 26;
    case "partnership":
      return 20;
    case "hiring":
      return 14;
    default:
      return 10;
  }
}

function sourceQuality(sourceType: string, sourceKind: IntelligenceSourceKind) {
  if (sourceKind === "site-change") {
    if (sourceType === "pricing") return 30;
    if (sourceType === "product") return 28;
    if (sourceType === "homepage") return 24;
    if (sourceType === "newsroom" || sourceType === "blog") return 22;
    if (sourceType === "careers") return 20;
    return 18;
  }

  if (sourceType === "newsroom" || sourceType === "blog") return 16;
  return 12;
}

function businessRelevance(text: string, keywords: string[] = [], goals: string[] = []) {
  const haystack = normalizeKey(text);
  const goalTokens = goals.flatMap((goal) => tokenize(goal));
  const matchedKeywords = keywords.filter((keyword) => haystack.includes(normalizeKey(keyword))).length;
  const matchedGoals = goalTokens.filter((goal) => haystack.includes(goal)).length;
  return clamp(matchedKeywords * 4 + matchedGoals * 2, 0, 18);
}

export function scoreSignalImportance(params: {
  sourceType: string;
  sourceKind: IntelligenceSourceKind;
  changeTypes: Array<ExtractedFactKind | string>;
  status: "initial" | "changed";
  text: string;
  keywords?: string[];
  goals?: string[];
  evidenceCount?: number;
  confidence?: number;
}) {
  const changeTypes = params.changeTypes.filter(Boolean) as ExtractedFactKind[];
  const severity = Math.max(...changeTypes.map(changeTypeSeverity), 6);
  const quality = sourceQuality(params.sourceType, params.sourceKind);
  const relevance = businessRelevance(params.text, params.keywords, params.goals);
  const freshness = params.status === "changed" ? 16 : 8;
  const confidence = clamp(params.confidence || 62, 1, 95) / 4;
  const evidenceBonus = Math.min(12, (params.evidenceCount || 1) * 3);

  return clamp(freshness + quality + severity + relevance + confidence + evidenceBonus, 1, 99);
}

function buildEventRecommendation(changeTypes: ExtractedFactKind[]) {
  if (changeTypes.includes("pricing")) {
    return "가격표와 패키지 구성을 우리 제안서, 세일즈 스크립트와 비교해 대응안을 정리하세요.";
  }

  if (changeTypes.includes("product")) {
    return "제품 차별점과 출시 속도 차이를 이번 주 세일즈/제품 우선순위에 반영하세요.";
  }

  if (changeTypes.includes("partnership")) {
    return "제휴 상대와 우리 파트너 공백을 비교해 영업 채널 대응안을 정리하세요.";
  }

  if (changeTypes.includes("hiring")) {
    return "채용 확대가 특정 투자 방향인지 JD와 역할 구성을 확인하세요.";
  }

  return "메시지 변화가 타깃 세그먼트 이동인지 포지셔닝 문구를 함께 검토하세요.";
}

function buildEventTitle(company: string, facts: ExtractedFact[]) {
  const primary = facts[0];
  if (!primary) {
    return `${company} 변화`;
  }

  if (primary.kind === "pricing") {
    const label = primary.afterValue || primary.value || primary.beforeValue || "가격";
    return `${company} 가격 변화 ${label}`.trim();
  }

  if (primary.kind === "hiring") {
    return `${company} 채용 포지션 변화`;
  }

  if (primary.kind === "partnership") {
    return `${company} 제휴/통합 변화`;
  }

  if (primary.kind === "product") {
    return `${company} 제품/기능 변화`;
  }

  return `${company} 메시지 변화`;
}

function buildEventSummary(company: string, facts: ExtractedFact[], evidenceKinds: IntelligenceSourceKind[]) {
  const primary = facts[0];
  if (!primary) {
    return `${company} 관련 변화가 감지됐습니다.`;
  }

  const corroborated =
    evidenceKinds.includes("news") && evidenceKinds.includes("site-change")
      ? "뉴스와 공식 사이트에서 동시에 확인됐습니다."
      : evidenceKinds.includes("site-change")
        ? "공식 사이트 기준으로 확인됐습니다."
        : "뉴스 기준으로 확인됐습니다.";

  if (primary.kind === "pricing" && (primary.afterValue || primary.beforeValue)) {
    return `${company} 가격/플랜 변화가 감지됐습니다. ${primary.beforeValue ? `${primary.beforeValue} -> ` : ""}${primary.afterValue || primary.value}. ${corroborated}`;
  }

  return `${company} ${primary.kind} 관련 변화가 감지됐습니다. ${primary.value}. ${corroborated}`;
}

function factMatches(left: ExtractedFact, right: ExtractedFact) {
  if (left.company !== right.company || left.kind !== right.kind) {
    return false;
  }

  if (daysBetween(left.occurredAt, right.occurredAt) > 30) {
    return false;
  }

  if (left.kind === "pricing") {
    const leftPlan = normalizeKey(left.value).split(" ").slice(0, 3).join(" ");
    const rightPlan = normalizeKey(right.value).split(" ").slice(0, 3).join(" ");
    return leftPlan === rightPlan || tokenSimilarity(left.value, right.value) >= 0.2;
  }

  if (left.kind === "hiring" || left.kind === "partnership") {
    return tokenSimilarity(left.value, right.value) >= 0.24;
  }

  return tokenSimilarity(left.value, right.value) >= 0.3;
}

export function buildSiteFacts(input: SiteEvidenceInput): ExtractedFact[] {
  const structured = input.structured;
  const facts: ExtractedFact[] = [];

  if (structured?.pricing?.length) {
    structured.pricing.forEach((item, index) => {
      facts.push({
        id: `${input.id}-pricing-${index}`,
        kind: "pricing",
        company: input.company,
        sourceType: input.sourceType,
        sourceKind: "site-change",
        value: normalizeText([item.plan, item.after || item.before].filter(Boolean).join(" ")),
        beforeValue: item.before,
        afterValue: item.after,
        confidence: item.before && item.after ? 88 : 80,
        evidenceIds: [input.id],
        occurredAt: input.pubDate,
      });
    });
  }

  if (structured?.messaging?.length) {
    structured.messaging.forEach((item, index) => {
      facts.push({
        id: `${input.id}-messaging-${index}`,
        kind: "messaging",
        company: input.company,
        sourceType: input.sourceType,
        sourceKind: "site-change",
        value: item.after,
        beforeValue: item.before,
        afterValue: item.after,
        confidence: 78,
        evidenceIds: [input.id],
        occurredAt: input.pubDate,
      });
    });
  }

  if (structured?.hiring?.length) {
    structured.hiring.forEach((item, index) => {
      item.addedRoles.forEach((role, roleIndex) => {
        facts.push({
          id: `${input.id}-hiring-added-${index}-${roleIndex}`,
          kind: "hiring",
          company: input.company,
          sourceType: input.sourceType,
          sourceKind: "site-change",
          value: role,
          afterValue: role,
          confidence: 74,
          evidenceIds: [input.id],
          occurredAt: input.pubDate,
        });
      });
      item.removedRoles.forEach((role, roleIndex) => {
        facts.push({
          id: `${input.id}-hiring-removed-${index}-${roleIndex}`,
          kind: "hiring",
          company: input.company,
          sourceType: input.sourceType,
          sourceKind: "site-change",
          value: role,
          beforeValue: role,
          confidence: 70,
          evidenceIds: [input.id],
          occurredAt: input.pubDate,
        });
      });
    });
  }

  if (structured?.partnership?.length) {
    structured.partnership.forEach((item, index) => {
      item.addedPartners.forEach((partner, partnerIndex) => {
        facts.push({
          id: `${input.id}-partnership-added-${index}-${partnerIndex}`,
          kind: "partnership",
          company: input.company,
          sourceType: input.sourceType,
          sourceKind: "site-change",
          value: partner,
          afterValue: partner,
          confidence: 78,
          evidenceIds: [input.id],
          occurredAt: input.pubDate,
        });
      });
      item.removedPartners.forEach((partner, partnerIndex) => {
        facts.push({
          id: `${input.id}-partnership-removed-${index}-${partnerIndex}`,
          kind: "partnership",
          company: input.company,
          sourceType: input.sourceType,
          sourceKind: "site-change",
          value: partner,
          beforeValue: partner,
          confidence: 74,
          evidenceIds: [input.id],
          occurredAt: input.pubDate,
        });
      });
    });
  }

  if (facts.length === 0) {
    const genericText = normalizeText(
      [input.title, input.summary, ...(input.added || []).slice(0, 2), ...(input.removed || []).slice(0, 1)]
        .filter(Boolean)
        .join(" ")
    );

    if (input.changeTypes.includes("product")) {
      facts.push({
        id: `${input.id}-product-generic`,
        kind: "product",
        company: input.company,
        sourceType: input.sourceType,
        sourceKind: "site-change",
        value: genericText || input.title,
        confidence: 70,
        evidenceIds: [input.id],
        occurredAt: input.pubDate,
      });
    } else if (input.changeTypes.includes("pricing")) {
      facts.push({
        id: `${input.id}-pricing-generic`,
        kind: "pricing",
        company: input.company,
        sourceType: input.sourceType,
        sourceKind: "site-change",
        value: genericText || input.title,
        confidence: 72,
        evidenceIds: [input.id],
        occurredAt: input.pubDate,
      });
    } else if (input.changeTypes.includes("hiring")) {
      facts.push({
        id: `${input.id}-hiring-generic`,
        kind: "hiring",
        company: input.company,
        sourceType: input.sourceType,
        sourceKind: "site-change",
        value: genericText || input.title,
        confidence: 66,
        evidenceIds: [input.id],
        occurredAt: input.pubDate,
      });
    } else if (input.changeTypes.includes("partnership")) {
      facts.push({
        id: `${input.id}-partnership-generic`,
        kind: "partnership",
        company: input.company,
        sourceType: input.sourceType,
        sourceKind: "site-change",
        value: genericText || input.title,
        confidence: 68,
        evidenceIds: [input.id],
        occurredAt: input.pubDate,
      });
    } else if (input.changeTypes.includes("messaging")) {
      facts.push({
        id: `${input.id}-messaging-generic`,
        kind: "messaging",
        company: input.company,
        sourceType: input.sourceType,
        sourceKind: "site-change",
        value: genericText || input.title,
        confidence: 64,
        evidenceIds: [input.id],
        occurredAt: input.pubDate,
      });
    }
  }

  return uniqueBy(facts, (item) =>
    `${item.kind}|${item.company}|${normalizeKey(item.value)}|${item.beforeValue || ""}|${item.afterValue || ""}`
  );
}

export function buildNewsFacts(input: NewsEvidenceInput): ExtractedFact[] {
  const text = normalizeText(`${input.title} ${input.summary}`);
  const normalized = normalizeKey(text);
  const facts: ExtractedFact[] = [];
  const pushFact = (kind: ExtractedFactKind, confidence: number, value?: string) => {
    facts.push({
      id: `${input.id}-${kind}-${facts.length + 1}`,
      kind,
      company: input.company,
      sourceType: "news",
      sourceKind: "news",
      value: normalizeText(value || input.title),
      confidence,
      evidenceIds: [input.id],
      occurredAt: input.pubDate,
    });
  };

  if (
    input.intent === "pricing" ||
    /\b(pricing|price|plan|plans|요금|가격|플랜|subscription)\b/i.test(normalized)
  ) {
    pushFact("pricing", 62, input.title);
  }

  if (
    input.intent === "partnership" ||
    /\b(partner|partnership|integration|integrations|제휴|협력|통합)\b/i.test(normalized)
  ) {
    pushFact("partnership", 64, input.title);
  }

  if (
    input.intent === "hiring" ||
    /\b(hiring|hire|recruit|job|jobs|채용|영입|reorganization|organization)\b/i.test(normalized)
  ) {
    pushFact("hiring", 60, input.title);
  }

  if (
    input.intent === "product" ||
    /\b(launch|release|feature|features|model|agent|platform|product|출시|기능|업데이트|신제품)\b/i.test(
      normalized
    )
  ) {
    pushFact("product", 66, input.title);
  }

  if (
    input.intent === "marketing" ||
    /\b(enterprise|workflow|automation|orchestration|secure|security|positioning|브랜드|메시지|포지셔닝)\b/i.test(
      normalized
    )
  ) {
    pushFact("messaging", 58, input.title);
  }

  return uniqueBy(facts, (item) => `${item.kind}|${item.company}|${normalizeKey(item.value)}`);
}

export function buildEventEvidenceMap(
  newsEvidence: NewsEvidenceInput[],
  siteEvidence: SiteEvidenceInput[]
) {
  const map = new Map<string, CorrelatedEventEvidence>();

  for (const item of newsEvidence) {
    map.set(item.id, {
      id: item.id,
      title: item.title,
      kind: "news",
      source: item.source,
      link: item.link,
      pubDate: item.pubDate,
    });
  }

  for (const item of siteEvidence) {
    map.set(item.id, {
      id: item.id,
      title: item.title,
      kind: "site-change",
      source: item.source,
      link: item.link,
      pubDate: item.pubDate,
    });
  }

  return map;
}

export function correlateFacts({
  company,
  facts,
  evidenceById,
  keywords = [],
  goals = [],
}: CorrelateParams): CorrelatedEvent[] {
  const relevantFacts = facts
    .filter((fact) => fact.company.trim().toLowerCase() === company.trim().toLowerCase())
    .sort((left, right) => {
      if (left.sourceKind !== right.sourceKind) {
        return left.sourceKind === "site-change" ? -1 : 1;
      }
      return right.confidence - left.confidence;
    });

  const groups: ExtractedFact[][] = [];

  for (const fact of relevantFacts) {
    const group = groups.find((candidate) => candidate.some((item) => factMatches(item, fact)));
    if (group) {
      group.push(fact);
    } else {
      groups.push([fact]);
    }
  }

  return groups
    .map((group, index) => {
      const dedupedFacts = uniqueBy(group, (item) => item.id);
      const changeTypes = uniqueStrings(dedupedFacts.map((item) => item.kind)) as ExtractedFactKind[];
      const evidenceIds = uniqueStrings(dedupedFacts.flatMap((item) => item.evidenceIds));
      const evidence = evidenceIds
        .map((id) => evidenceById.get(id))
        .filter((item): item is CorrelatedEventEvidence => !!item);
      const sourceKinds = uniqueStrings(
        evidence.map((item) => item.kind)
      ) as IntelligenceSourceKind[];
      const confidenceBase =
        dedupedFacts.length > 0
          ? dedupedFacts.reduce((sum, item) => sum + item.confidence, 0) / dedupedFacts.length
          : 55;
      const corroborationBonus =
        sourceKinds.includes("news") && sourceKinds.includes("site-change") ? 8 : 0;
      const severity = Math.max(...changeTypes.map(changeTypeSeverity), 6);
      const quality = Math.max(...dedupedFacts.map((item) => sourceQuality(item.sourceType, item.sourceKind)), 10);
      const relevance = businessRelevance(
        dedupedFacts.map((item) => `${item.value} ${item.afterValue || ""}`).join(" "),
        keywords,
        goals
      );
      const evidenceBonus = Math.min(12, evidence.length * 3);
      const confidence = clamp(confidenceBase + corroborationBonus, 1, 99);
      const importance = clamp(severity + quality + relevance + evidenceBonus + confidence / 4, 1, 99);
      const occurredAt = evidence
        .map((item) => item.pubDate)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || new Date().toISOString();

      const orderedFacts = [...dedupedFacts].sort((left, right) => right.confidence - left.confidence);

      return {
        id: `${normalizeKey(company).replace(/\s+/g, "-") || "event"}-${index + 1}-${changeTypes.join("-")}`,
        company,
        title: buildEventTitle(company, orderedFacts),
        summary: buildEventSummary(company, orderedFacts, sourceKinds),
        changeTypes,
        evidenceIds,
        importance,
        confidence,
        recommendedAction: buildEventRecommendation(changeTypes),
        occurredAt,
        evidenceCount: evidence.length,
        sourceKinds,
        facts: orderedFacts,
        evidence,
      } satisfies CorrelatedEvent;
    })
    .sort((left, right) => right.importance - left.importance)
    .slice(0, 12);
}
