import { runAgenticScan, type AgenticScanResult } from "@/lib/agentic/scan";
import type { StructuredChangeSet } from "@/lib/app/structured-change";

type RadarContext = {
  companyName?: string;
  companyWebsite?: string;
  description?: string;
  goals?: string[];
  keywords?: string[];
};

type TrackedCompanyInput = {
  id?: string;
  name: string;
  website: string;
};

export interface AgenticRadarSignal {
  id: string;
  company: string;
  title: string;
  category: "opportunity" | "threat" | "trend";
  importance: number;
  time: string;
  description: string;
  source: string;
  link: string;
  sourceType: string;
  changeTypes: string[];
  added: string[];
  removed: string[];
  recommendation: string;
  status: "initial" | "changed";
  structured?: StructuredChangeSet;
}

export interface AgenticRadarCompanyResult {
  company: string;
  website: string;
  summary: string;
  status: "ok" | "error";
  scan?: AgenticScanResult;
  error?: string;
  signals: AgenticRadarSignal[];
}

export interface AgenticRadarOverview {
  headline: string;
  summary: string;
  actions: string[];
  scannedCompanies: number;
  changedSignals: number;
  initialSignals: number;
  errors: number;
}

export interface AgenticRadarResponse {
  success: boolean;
  engine: "agentic-radar";
  overview: AgenticRadarOverview;
  companyResults: AgenticRadarCompanyResult[];
  signals: AgenticRadarSignal[];
  timestamp: string;
}

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function changeTypeLabel(changeType: string) {
  const labels: Record<string, string> = {
    pricing: "가격",
    product: "제품",
    hiring: "채용",
    messaging: "메시지",
    partnership: "제휴",
    announcement: "공지",
    initial: "초기 추적",
  };

  return labels[changeType] || changeType;
}

function buildRecommendation(changeTypes: string[]) {
  if (changeTypes.includes("pricing")) {
    return "가격표와 패키지 구성을 우리 제안서와 비교해 대응안을 정리하세요.";
  }

  if (changeTypes.includes("product")) {
    return "제품/기능 차별점 문구를 이번 주 세일즈 스크립트에 반영하세요.";
  }

  if (changeTypes.includes("partnership")) {
    return "제휴 상대와 우리 기존 파트너십 공백을 비교해 영업 타깃을 재정렬하세요.";
  }

  if (changeTypes.includes("hiring")) {
    return "채용 확대가 특정 기능 투자 신호인지 JD와 팀 구조를 확인하세요.";
  }

  if (changeTypes.includes("messaging")) {
    return "메인 카피 변화가 타깃 시장 이동인지 포지셔닝 문구를 함께 검토하세요.";
  }

  return "변화 원문을 열어 근거를 확인하고 주간 전략회의 입력값으로 반영하세요.";
}

function pickCategory(changeTypes: string[], isOwnCompany: boolean) {
  if (isOwnCompany) {
    if (changeTypes.includes("pricing") || changeTypes.includes("product")) {
      return "opportunity" as const;
    }
    return "trend" as const;
  }

  if (
    changeTypes.includes("pricing") ||
    changeTypes.includes("product") ||
    changeTypes.includes("partnership") ||
    changeTypes.includes("messaging")
  ) {
    return "threat" as const;
  }

  return "trend" as const;
}

function computeImportance(
  changeTypes: string[],
  added: string[],
  sourceType: string,
  status: "initial" | "changed",
  keywords: string[]
) {
  let score = status === "changed" ? 72 : 58;
  const normalizedAdded = added.join(" ").toLowerCase();

  if (sourceType === "pricing") score += 8;
  if (sourceType === "product") score += 6;
  if (sourceType === "homepage") score += 4;

  if (changeTypes.includes("pricing")) score += 12;
  if (changeTypes.includes("product")) score += 10;
  if (changeTypes.includes("partnership")) score += 9;
  if (changeTypes.includes("hiring")) score += 6;
  if (changeTypes.includes("messaging")) score += 6;

  for (const keyword of keywords) {
    if (keyword && normalizedAdded.includes(keyword.toLowerCase())) {
      score += 4;
    }
  }

  return Math.max(1, Math.min(99, score));
}

function buildSignalTitle(
  company: string,
  sourceLabel: string,
  changeTypes: string[],
  status: "initial" | "changed"
) {
  if (status === "initial") {
    return `${company} ${sourceLabel} 기준선 확보`;
  }

  const primaryType = changeTypes[0] || "content";
  return `${company} ${sourceLabel} ${changeTypeLabel(primaryType)} 변화`;
}

function buildSignalDescription(
  company: string,
  scanSummary: string,
  added: string[],
  removed: string[]
) {
  const highlights = [
    added[0] ? `추가: ${added[0]}` : "",
    removed[0] ? `삭제: ${removed[0]}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return highlights.length > 0 ? `${company}: ${scanSummary} ${highlights}` : `${company}: ${scanSummary}`;
}

function relativeTime(time: string) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "최근";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function companySummary(result: AgenticScanResult) {
  if (result.summary.changed > 0) {
    return `${result.company}에서 ${result.summary.changed}건의 변화가 감지됐습니다.`;
  }

  if (result.summary.initial > 0) {
    return `${result.company}의 공식 소스 기준선을 처음 저장했습니다.`;
  }

  if (result.summary.errors > 0 && result.summary.visited === 0) {
    return `${result.company} 스캔에 실패했습니다. 추적 URL을 점검하세요.`;
  }

  return `${result.company}에서 새 변화는 없었고, 기존 추적 상태를 유지했습니다.`;
}

function companySignals(
  company: TrackedCompanyInput,
  result: AgenticScanResult,
  context: RadarContext
) {
  const isOwnCompany =
    context.companyName?.trim().toLowerCase() === company.name.trim().toLowerCase();
  const keywords = context.keywords ?? [];

  return result.results
    .filter((item) => item.fetch.status === "success" && item.diff && item.diff.status !== "unchanged")
    .map((item, index) => {
      const status = item.diff?.status === "initial" ? "initial" : "changed";
      const changeTypes = uniqueStrings(
        (item.diff?.changeTypes.length ? item.diff.changeTypes : [item.source.type]).filter(
          (entry) => entry !== "initial"
        )
      );

      return {
        id: `${company.name}-${item.source.id}-${index}`,
        company: company.name,
        title: buildSignalTitle(company.name, item.source.label, changeTypes, status),
        category: pickCategory(changeTypes, isOwnCompany),
        importance: computeImportance(
          changeTypes,
          item.diff?.added || [],
          item.source.type,
          status,
          keywords
        ),
        time: relativeTime(item.fetch.fetchedAt),
        description: buildSignalDescription(
          company.name,
          item.diff?.summary || "",
          item.diff?.added || [],
          item.diff?.removed || []
        ),
        source: item.source.label,
        link: item.fetch.finalUrl || item.source.url,
        sourceType: item.source.type,
        changeTypes,
        added: item.diff?.added || [],
        removed: item.diff?.removed || [],
        recommendation: buildRecommendation(changeTypes),
        status,
        structured: item.diff?.structured,
      } satisfies AgenticRadarSignal;
    })
    .sort((a, b) => b.importance - a.importance);
}

function buildOverview(
  companyResults: AgenticRadarCompanyResult[],
  signals: AgenticRadarSignal[]
): AgenticRadarOverview {
  const scannedCompanies = companyResults.filter((item) => item.status === "ok").length;
  const errors = companyResults.filter((item) => item.status === "error").length;
  const changedSignals = signals.filter((item) => item.status === "changed").length;
  const initialSignals = signals.filter((item) => item.status === "initial").length;
  const changeTypes = uniqueStrings(signals.flatMap((item) => item.changeTypes));
  const actions = uniqueStrings(signals.map((item) => item.recommendation)).slice(0, 3);

  const headline =
    changedSignals > 0
      ? `${changedSignals}건의 의미 있는 변화가 감지됐습니다`
      : initialSignals > 0
        ? `${initialSignals}개 소스의 기준선을 확보했습니다`
        : scannedCompanies > 0
          ? "새로운 변화는 없지만 추적은 정상 동작 중입니다"
          : "추적할 웹사이트를 설정해야 합니다";

  const summary =
    scannedCompanies > 0
      ? `${scannedCompanies}개 회사를 스캔했고 ${
          changedSignals > 0 ? `변화 ${changedSignals}건` : `변화 없음`
        } 상태입니다.${changeTypes.length > 0 ? ` 주요 변화: ${changeTypes.map(changeTypeLabel).join(", ")}` : ""}`
      : "회사 웹사이트와 추적 대상을 설정하면 agentic search가 공식 사이트를 탐색합니다.";

  return {
    headline,
    summary,
    actions:
      actions.length > 0
        ? actions
        : ["추적 대상의 공식 홈페이지와 가격 페이지를 먼저 등록하세요."],
    scannedCompanies,
    changedSignals,
    initialSignals,
    errors,
  };
}

export async function runAgenticRadar(params: {
  trackedCompanies: TrackedCompanyInput[];
  context?: RadarContext;
  sourceLimit?: number;
}): Promise<AgenticRadarResponse> {
  const trackedCompanies = params.trackedCompanies
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      website: normalizeUrl(item.website),
    }))
    .filter((item) => item.name.length > 0 && item.website.length > 0)
    .slice(0, 4);

  const companyResults: AgenticRadarCompanyResult[] = [];
  const allSignals: AgenticRadarSignal[] = [];

  for (const company of trackedCompanies) {
    try {
      const scan = await runAgenticScan({
        company: company.name,
        website: company.website,
        sourceLimit: params.sourceLimit ?? 4,
      });
      const signals = companySignals(company, scan, params.context ?? {});

      companyResults.push({
        company: company.name,
        website: company.website,
        summary: companySummary(scan),
        status: "ok",
        scan,
        signals,
      });
      allSignals.push(...signals);
    } catch (error: any) {
      companyResults.push({
        company: company.name,
        website: company.website,
        summary: `${company.name} 스캔에 실패했습니다.`,
        status: "error",
        error: error?.message || "Unknown error",
        signals: [],
      });
    }
  }

  const overview = buildOverview(
    companyResults,
    allSignals.sort((a, b) => b.importance - a.importance)
  );

  return {
    success: true,
    engine: "agentic-radar",
    overview,
    companyResults,
    signals: allSignals.sort((a, b) => b.importance - a.importance).slice(0, 24),
    timestamp: new Date().toISOString(),
  };
}
