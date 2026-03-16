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
}

export function normalizeVaultItems(raw: unknown): VaultItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => {
      const type: VaultItemType =
        item.type === "signal" || item.type === "action" || item.type === "brief"
          ? item.type
          : "brief";

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
      };
    })
    .filter((item) => item.title.length > 0);
}
