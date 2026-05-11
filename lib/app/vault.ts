export type VaultItemType = "signal" | "action" | "brief";

export interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  content: string;
  tags: string[];
  company?: string;
  source?: string;
  link?: string;
  savedAt: string;
  actionStatus?: "todo" | "doing" | "done";
  owner?: "CEO" | "Product" | "Sales" | "Ops";
  horizon?: "now" | "30d" | "90d";
  priority?: "high" | "medium" | "low";
  sourceKind?: "brief" | "signal" | "event";
  sourceId?: string;
}

export function normalizeVaultItems(raw: unknown): VaultItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item): VaultItem => {
      const type: VaultItemType =
        item.type === "signal" || item.type === "action" || item.type === "brief"
          ? item.type
          : "brief";
      const actionStatus: VaultItem["actionStatus"] =
        item.actionStatus === "todo" || item.actionStatus === "doing" || item.actionStatus === "done"
          ? item.actionStatus
          : undefined;
      const owner: VaultItem["owner"] =
        item.owner === "CEO" || item.owner === "Product" || item.owner === "Sales" || item.owner === "Ops"
          ? item.owner
          : undefined;
      const horizon: VaultItem["horizon"] =
        item.horizon === "now" || item.horizon === "30d" || item.horizon === "90d" ? item.horizon : undefined;
      const priority: VaultItem["priority"] =
        item.priority === "high" || item.priority === "medium" || item.priority === "low"
          ? item.priority
          : undefined;
      const sourceKind: VaultItem["sourceKind"] =
        item.sourceKind === "brief" || item.sourceKind === "signal" || item.sourceKind === "event"
          ? item.sourceKind
          : undefined;

      return {
        id:
          typeof item.id === "string" && item.id.trim().length > 0
            ? item.id
            : `vault-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        title: typeof item.title === "string" ? item.title : "",
        content: typeof item.content === "string" ? item.content : "",
        tags: Array.isArray(item.tags)
          ? item.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
          : [],
        company: typeof item.company === "string" ? item.company : undefined,
        source: typeof item.source === "string" ? item.source : undefined,
        link: typeof item.link === "string" ? item.link : undefined,
        savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString(),
        actionStatus,
        owner,
        horizon,
        priority,
        sourceKind,
        sourceId: typeof item.sourceId === "string" ? item.sourceId : undefined,
      };
    })
    .filter((item) => item.title.length > 0);
}
