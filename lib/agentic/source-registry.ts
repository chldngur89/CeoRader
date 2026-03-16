import path from "path";

import { AGENTIC_ROOT, dedupeStrings, readJsonFile, toSlug, writeJsonFile } from "@/lib/agentic/storage";

export type TrackedSourceType =
  | "homepage"
  | "pricing"
  | "product"
  | "blog"
  | "newsroom"
  | "careers"
  | "custom";

export type CrawlStrategy = "playwright";

export interface TrackedSource {
  id: string;
  type: TrackedSourceType;
  label: string;
  url: string;
  candidateUrls: string[];
  strategy: CrawlStrategy;
  priority: number;
  isActive: boolean;
  tags: string[];
}

export interface TrackedEntityRegistry {
  entityId: string;
  company: string;
  website: string;
  createdAt: string;
  updatedAt: string;
  sources: TrackedSource[];
}

export interface ManualTrackedSourceInput {
  type?: TrackedSourceType;
  label?: string;
  url: string;
  priority?: number;
  isActive?: boolean;
  tags?: string[];
}

type RegistryInput = {
  company: string;
  website?: string;
  includeDefaults?: boolean;
  manualSources?: ManualTrackedSourceInput[];
};

const ENTITY_DIR = path.join(AGENTIC_ROOT, "entities");

function getRegistryPath(entityId: string) {
  return path.join(ENTITY_DIR, `${entityId}.json`);
}

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) {
    throw new Error("URL is required");
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(candidate);
  parsed.hash = "";

  if (parsed.pathname === "/") {
    parsed.pathname = "";
  }

  return parsed.toString().replace(/\/$/, "");
}

function getOriginUrl(website: string) {
  const parsed = new URL(normalizeUrl(website));
  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function buildUrls(origin: string, paths: string[]) {
  return dedupeStrings(
    paths.map((item) => new URL(item, `${origin}/`).toString().replace(/\/$/, ""))
  );
}

function makeSourceId(type: TrackedSourceType, label: string) {
  return `${type}-${toSlug(label)}`;
}

function createSource(
  type: TrackedSourceType,
  label: string,
  candidateUrls: string[],
  priority: number,
  tags: string[] = []
): TrackedSource {
  const normalizedCandidates = dedupeStrings(candidateUrls.map((item) => normalizeUrl(item)));

  return {
    id: makeSourceId(type, label),
    type,
    label,
    url: normalizedCandidates[0],
    candidateUrls: normalizedCandidates,
    strategy: "playwright",
    priority,
    isActive: true,
    tags: dedupeStrings(tags),
  };
}

export function suggestTrackedSources(website: string): TrackedSource[] {
  const normalizedWebsite = normalizeUrl(website);
  const origin = getOriginUrl(website);

  return [
    createSource("homepage", "Homepage", [normalizedWebsite, origin], 100, ["hero", "positioning"]),
    createSource(
      "pricing",
      "Pricing",
      buildUrls(origin, ["/pricing", "/plans", "/pricing/"]),
      95,
      ["pricing", "plan"]
    ),
    createSource(
      "product",
      "Product",
      buildUrls(origin, ["/product", "/products", "/solutions", "/features"]),
      90,
      ["product", "feature"]
    ),
    createSource("blog", "Blog", buildUrls(origin, ["/blog"]), 82, ["content", "launch"]),
    createSource(
      "newsroom",
      "Newsroom",
      buildUrls(origin, ["/newsroom", "/news", "/press"]),
      80,
      ["announcement", "press"]
    ),
    createSource(
      "careers",
      "Careers",
      buildUrls(origin, ["/careers", "/jobs", "/careers/"]),
      76,
      ["hiring", "team"]
    ),
  ];
}

function mapManualSource(input: ManualTrackedSourceInput, index: number): TrackedSource {
  const type = input.type ?? "custom";
  const label = input.label?.trim() || `Custom ${index + 1}`;
  const normalizedUrl = normalizeUrl(input.url);

  return {
    id: makeSourceId(type, label),
    type,
    label,
    url: normalizedUrl,
    candidateUrls: [normalizedUrl],
    strategy: "playwright",
    priority: input.priority ?? 70 - index,
    isActive: input.isActive ?? true,
    tags: dedupeStrings(input.tags ?? []),
  };
}

function mergeSources(
  existing: TrackedSource[],
  incoming: TrackedSource[],
) {
  const merged = new Map<string, TrackedSource>();

  for (const source of existing) {
    merged.set(source.id, source);
  }

  for (const source of incoming) {
    const current = merged.get(source.id);

    if (!current) {
      merged.set(source.id, source);
      continue;
    }

    const replaceCandidates = source.type !== "custom";

    merged.set(source.id, {
      ...current,
      ...source,
      url: replaceCandidates ? source.url : source.url || current.url,
      candidateUrls: replaceCandidates
        ? source.candidateUrls
        : dedupeStrings([...current.candidateUrls, ...source.candidateUrls]),
      tags: dedupeStrings([...current.tags, ...source.tags]),
      priority: Math.max(current.priority, source.priority),
      isActive: current.isActive ?? source.isActive,
    });
  }

  return Array.from(merged.values()).sort((a, b) => b.priority - a.priority);
}

export async function loadSourceRegistry(company: string) {
  const entityId = toSlug(company);
  return readJsonFile<TrackedEntityRegistry>(getRegistryPath(entityId));
}

export async function ensureSourceRegistry({
  company,
  website,
  includeDefaults = true,
  manualSources = [],
}: RegistryInput): Promise<TrackedEntityRegistry> {
  const normalizedCompany = company.trim();
  if (!normalizedCompany) {
    throw new Error("Company name required");
  }

  const entityId = toSlug(normalizedCompany);
  const existing = await readJsonFile<TrackedEntityRegistry>(getRegistryPath(entityId));
  const normalizedWebsite = website
    ? normalizeUrl(website)
    : existing?.website || "";

  if (!normalizedWebsite) {
    throw new Error("Website is required to create the first tracked source registry");
  }

  const defaultSources = includeDefaults ? suggestTrackedSources(normalizedWebsite) : [];
  const customSources = manualSources.map((item, index) => mapManualSource(item, index));
  const now = new Date().toISOString();

  const registry: TrackedEntityRegistry = {
    entityId,
    company: normalizedCompany,
    website: normalizedWebsite,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    sources: mergeSources(existing?.sources ?? [], [...defaultSources, ...customSources]),
  };

  await writeJsonFile(getRegistryPath(entityId), registry);
  return registry;
}
