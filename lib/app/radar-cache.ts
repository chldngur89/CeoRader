import type { TrackedCompany } from "@/lib/app/state";
import type { StructuredChangeSet } from "@/lib/app/structured-change";

export interface RadarSignal {
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

export interface RadarCompanyResult {
  company: string;
  website: string;
  summary: string;
  status: "ok" | "error";
  error?: string;
  scan?: {
    summary: {
      visited: number;
      changed: number;
      unchanged: number;
      initial: number;
      errors: number;
      changeTypes: string[];
    };
  };
  signals: RadarSignal[];
}

export interface RadarOverview {
  headline: string;
  summary: string;
  actions: string[];
  scannedCompanies: number;
  changedSignals: number;
  initialSignals: number;
  errors: number;
}

export interface RadarResponse {
  success: boolean;
  engine: "agentic-radar";
  overview: RadarOverview;
  companyResults: RadarCompanyResult[];
  signals: RadarSignal[];
  timestamp: string;
}

export interface CachedRadarResponse extends RadarResponse {
  trackedCompaniesSignature: string;
}

export function trackedCompaniesSignature(trackedCompanies: TrackedCompany[]) {
  return trackedCompanies
    .map((item) => `${item.name.trim().toLowerCase()}|${item.website.trim().toLowerCase()}`)
    .sort()
    .join("||");
}

export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
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
