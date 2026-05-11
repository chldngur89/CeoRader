import type { CorrelatedEvent } from "@/lib/app/intelligence";
import type { RadarSignal } from "@/lib/app/radar-cache";
import type { TopicBriefAction } from "@/lib/app/topic-brief";
import type { VaultItem } from "@/lib/app/vault";

export type ActionOwner = "CEO" | "Product" | "Sales" | "Ops";
export type ActionHorizon = "now" | "30d" | "90d";
export type ActionPriority = "high" | "medium" | "low";
export type ActionStatus = "todo" | "doing" | "done";
export type ActionSourceKind = "brief" | "signal" | "event";

export interface ActionItem {
  id: string;
  sourceKind: ActionSourceKind;
  sourceId: string;
  title: string;
  owner: ActionOwner;
  horizon: ActionHorizon;
  priority: ActionPriority;
  status: ActionStatus;
  rationale: string;
  createdAt: string;
  company?: string;
  link?: string;
  tags: string[];
}

function toKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeActionItems(raw: unknown): ActionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item): ActionItem => {
      const sourceKind: ActionSourceKind =
        item.sourceKind === "brief" || item.sourceKind === "signal" || item.sourceKind === "event"
          ? item.sourceKind
          : "brief";
      const owner: ActionOwner =
        item.owner === "CEO" || item.owner === "Product" || item.owner === "Sales" || item.owner === "Ops"
          ? item.owner
          : "CEO";
      const horizon: ActionHorizon =
        item.horizon === "now" || item.horizon === "30d" || item.horizon === "90d" ? item.horizon : "30d";
      const priority: ActionPriority =
        item.priority === "high" || item.priority === "medium" || item.priority === "low"
          ? item.priority
          : "medium";
      const status: ActionStatus =
        item.status === "todo" || item.status === "doing" || item.status === "done" ? item.status : "todo";

      return {
        id:
          typeof item.id === "string" && item.id.trim().length > 0
            ? item.id
            : `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sourceKind,
        sourceId: typeof item.sourceId === "string" ? item.sourceId : "",
        title: typeof item.title === "string" ? item.title : "",
        owner,
        horizon,
        priority,
        status,
        rationale: typeof item.rationale === "string" ? item.rationale : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        company: typeof item.company === "string" ? item.company : undefined,
        link: typeof item.link === "string" ? item.link : undefined,
        tags: Array.isArray(item.tags)
          ? item.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
          : [],
      };
    })
    .filter((item) => item.title.trim().length > 0);
}

export function actionDedupKey(action: Pick<ActionItem, "sourceKind" | "sourceId" | "title">) {
  return `${action.sourceKind}|${action.sourceId}|${toKey(action.title)}`;
}

export function upsertActionItem(items: ActionItem[], next: ActionItem) {
  const nextKey = actionDedupKey(next);
  if (items.some((item) => actionDedupKey(item) === nextKey)) {
    return items;
  }

  return [next, ...items];
}

export function createActionFromBriefAction(topic: string, action: TopicBriefAction): ActionItem {
  return {
    id: `action-brief-${toKey(topic)}-${toKey(action.id || action.title)}`,
    sourceKind: "brief",
    sourceId: action.id,
    title: action.title,
    owner: action.owner,
    horizon: action.horizon,
    priority: action.priority,
    status: "todo",
    rationale: action.rationale,
    createdAt: new Date().toISOString(),
    tags: [topic, action.owner, action.horizon, action.priority].filter(Boolean),
  };
}

export function createActionFromSignal(signal: RadarSignal): ActionItem {
  return {
    id: `action-signal-${toKey(signal.id)}`,
    sourceKind: "signal",
    sourceId: signal.id,
    title: signal.recommendation,
    owner: signal.category === "threat" ? "Sales" : signal.sourceType === "careers" ? "Ops" : "CEO",
    horizon: signal.status === "changed" ? "now" : "30d",
    priority: signal.importance >= 80 ? "high" : signal.importance >= 65 ? "medium" : "low",
    status: "todo",
    rationale: `${signal.title} · ${signal.description}`,
    createdAt: new Date().toISOString(),
    company: signal.company,
    link: signal.link,
    tags: [signal.company, ...signal.changeTypes].slice(0, 6),
  };
}

export function createActionFromEvent(event: CorrelatedEvent): ActionItem {
  const owner: ActionOwner = event.changeTypes.includes("pricing")
    ? "CEO"
    : event.changeTypes.includes("product")
      ? "Product"
      : event.changeTypes.includes("partnership")
        ? "Sales"
        : event.changeTypes.includes("hiring")
          ? "Ops"
          : "Sales";

  const horizon: ActionHorizon = event.importance >= 80 ? "now" : event.importance >= 65 ? "30d" : "90d";
  const priority: ActionPriority = event.importance >= 80 ? "high" : event.importance >= 60 ? "medium" : "low";

  return {
    id: `action-event-${toKey(event.id)}`,
    sourceKind: "event",
    sourceId: event.id,
    title: event.recommendedAction || event.title,
    owner,
    horizon,
    priority,
    status: "todo",
    rationale: event.summary,
    createdAt: new Date().toISOString(),
    company: event.company,
    link: event.evidence[0]?.link,
    tags: [event.company, ...event.changeTypes].slice(0, 6),
  };
}

export function createVaultItemFromAction(action: ActionItem): VaultItem {
  return {
    id: `vault-${action.id}`,
    type: "action",
    title: action.title,
    content: action.rationale,
    tags: action.tags,
    company: action.company,
    source: action.sourceKind,
    link: action.link,
    savedAt: action.createdAt,
    actionStatus: action.status,
    owner: action.owner,
    horizon: action.horizon,
    priority: action.priority,
    sourceKind: action.sourceKind,
    sourceId: action.sourceId,
  };
}
