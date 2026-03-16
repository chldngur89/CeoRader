import type { StructuredChangeSet } from "@/lib/app/structured-change";

export type TopicBriefLens =
  | "adoption"
  | "competition"
  | "infrastructure"
  | "regulation"
  | "talent";

export interface TopicBriefEvidence {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDate: string;
  lens: TopicBriefLens;
  summary: string;
  whyRelevant: string;
  score: number;
  kind: "news" | "site-change";
  company?: string;
  sourceType?: string;
  changeTypes?: string[];
  status?: "initial" | "changed";
  structured?: StructuredChangeSet;
}

export interface TopicBriefInsight {
  id: string;
  title: string;
  lens: TopicBriefLens;
  summary: string;
  whyItMatters: string;
  priority: "high" | "medium" | "low";
  confidence: number;
  evidenceIds: string[];
}

export interface TopicBriefAction {
  id: string;
  title: string;
  owner: "CEO" | "Product" | "Sales" | "Ops";
  horizon: "now" | "30d" | "90d";
  priority: "high" | "medium" | "low";
  rationale: string;
}

export interface TopicBriefOfficialSignal {
  id: string;
  company: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  sourceType: string;
  changeTypes: string[];
  recommendation: string;
  importance: number;
  status: "initial" | "changed";
  structured?: StructuredChangeSet;
}

export interface TopicBriefAnalysis {
  topic: string;
  summary: string;
  insights: TopicBriefInsight[];
  actions: TopicBriefAction[];
  evidence: TopicBriefEvidence[];
  officialSignals: TopicBriefOfficialSignal[];
  watchouts: string[];
  metrics: {
    totalDocuments: number;
    curatedDocuments: number;
    staleDocuments: number;
    officialSignals: number;
    changedOfficialSignals: number;
    trackedCompaniesScanned: number;
  };
  events: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
  }>;
  generatedAt: string;
  engine: "radar-search";
}

export interface TopicBriefHistoryEntry {
  topic: string;
  savedAt: string;
  analysis: TopicBriefAnalysis;
}

export interface TopicBriefDiff {
  newInsights: string[];
  resolvedInsights: string[];
  activeLenses: TopicBriefLens[];
}

export function normalizeTopicBriefAnalysis(raw: unknown): TopicBriefAnalysis {
  const object = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const metrics =
    object.metrics && typeof object.metrics === "object"
      ? (object.metrics as Record<string, unknown>)
      : {};

  return {
    topic: typeof object.topic === "string" ? object.topic : "",
    summary: typeof object.summary === "string" ? object.summary : "",
    insights: Array.isArray(object.insights) ? (object.insights as TopicBriefInsight[]) : [],
    actions: Array.isArray(object.actions) ? (object.actions as TopicBriefAction[]) : [],
    evidence: Array.isArray(object.evidence)
      ? (object.evidence as TopicBriefEvidence[]).map((item) => ({
          ...item,
          kind: item.kind || "news",
        }))
      : [],
    officialSignals: Array.isArray(object.officialSignals)
      ? (object.officialSignals as TopicBriefOfficialSignal[])
      : [],
    watchouts: Array.isArray(object.watchouts) ? (object.watchouts as string[]) : [],
    metrics: {
      totalDocuments: typeof metrics.totalDocuments === "number" ? metrics.totalDocuments : 0,
      curatedDocuments: typeof metrics.curatedDocuments === "number" ? metrics.curatedDocuments : 0,
      staleDocuments: typeof metrics.staleDocuments === "number" ? metrics.staleDocuments : 0,
      officialSignals: typeof metrics.officialSignals === "number" ? metrics.officialSignals : 0,
      changedOfficialSignals:
        typeof metrics.changedOfficialSignals === "number" ? metrics.changedOfficialSignals : 0,
      trackedCompaniesScanned:
        typeof metrics.trackedCompaniesScanned === "number" ? metrics.trackedCompaniesScanned : 0,
    },
    events: Array.isArray(object.events)
      ? (object.events as TopicBriefAnalysis["events"])
      : [],
    generatedAt: typeof object.generatedAt === "string" ? object.generatedAt : new Date().toISOString(),
    engine: "radar-search",
  };
}

export function normalizeTopicBriefHistory(raw: unknown): TopicBriefHistoryEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      topic: typeof item.topic === "string" ? item.topic : "",
      savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString(),
      analysis: normalizeTopicBriefAnalysis(item.analysis),
    }))
    .filter((item) => item.topic.length > 0 && !!item.analysis);
}

export function diffTopicBriefs(
  previous: TopicBriefAnalysis | null,
  current: TopicBriefAnalysis
): TopicBriefDiff {
  if (!previous) {
    return {
      newInsights: current.insights.map((item) => item.title),
      resolvedInsights: [],
      activeLenses: current.insights.map((item) => item.lens),
    };
  }

  const previousTitles = new Set(previous.insights.map((item) => item.title));
  const currentTitles = new Set(current.insights.map((item) => item.title));

  return {
    newInsights: current.insights
      .map((item) => item.title)
      .filter((title) => !previousTitles.has(title)),
    resolvedInsights: previous.insights
      .map((item) => item.title)
      .filter((title) => !currentTitles.has(title)),
    activeLenses: Array.from(new Set(current.insights.map((item) => item.lens))),
  };
}
