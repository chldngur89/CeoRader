import path from "path";

import {
  createEmptyStructuredChangeSet,
  type StructuredChangeSet,
} from "@/lib/app/structured-change";
import { AGENTIC_ROOT, dedupeStrings, readJsonFile, writeJsonFile } from "@/lib/agentic/storage";
import type { PageFetchSuccess } from "@/lib/agentic/playwright-fetcher";
import type { TrackedSource, TrackedSourceType } from "@/lib/agentic/source-registry";

export interface StoredSnapshot {
  snapshotId: string;
  entityId: string;
  sourceId: string;
  sourceType: TrackedSourceType;
  sourceLabel: string;
  url: string;
  finalUrl: string;
  title: string;
  metaDescription: string;
  headings: string[];
  excerpt: string;
  text: string;
  blocks: string[];
  contentHash: string;
  collectedAt: string;
}

export interface SnapshotDiff {
  status: "initial" | "unchanged" | "changed";
  summary: string;
  similarity: number;
  changeTypes: string[];
  added: string[];
  removed: string[];
  structured: StructuredChangeSet;
  previousSnapshotAt?: string;
  currentSnapshotAt: string;
}

const SNAPSHOT_DIR = path.join(AGENTIC_ROOT, "snapshots");
const HISTORY_DIR = path.join(AGENTIC_ROOT, "snapshot-history");

function getLatestSnapshotPath(entityId: string, sourceId: string) {
  return path.join(SNAPSHOT_DIR, entityId, `${sourceId}.json`);
}

function getHistorySnapshotPath(entityId: string, sourceId: string, collectedAt: string) {
  const safeTimestamp = collectedAt.replace(/[:.]/g, "-");
  return path.join(HISTORY_DIR, entityId, sourceId, `${safeTimestamp}.json`);
}

function normalizeBlock(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildBlocks(fetchResult: PageFetchSuccess) {
  const bodyBlocks = fetchResult.text
    .split(/\n+/)
    .map((item) => normalizeBlock(item))
    .filter((item) => item.length >= 24);

  return dedupeStrings(
    [fetchResult.title, fetchResult.metaDescription, ...fetchResult.headings, ...bodyBlocks].filter(
      (item) => normalizeBlock(item).length >= 12
    )
  ).slice(0, 120);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function intersectsWithKeywords(lines: string[], patterns: string[]) {
  const normalizedPatterns = patterns.map((item) => item.toLowerCase());
  return lines.some((line) =>
    normalizedPatterns.some((pattern) => line.toLowerCase().includes(pattern))
  );
}

function inferChangeTypes(sourceType: TrackedSourceType, added: string[], removed: string[]) {
  const lines = [...added, ...removed];
  const changeTypes = new Set<string>();

  if (sourceType === "pricing") changeTypes.add("pricing");
  if (sourceType === "product") changeTypes.add("product");
  if (sourceType === "careers") changeTypes.add("hiring");
  if (sourceType === "homepage") changeTypes.add("messaging");
  if (sourceType === "blog" || sourceType === "newsroom") changeTypes.add("announcement");

  if (
    intersectsWithKeywords(lines, [
      "pricing",
      "plan",
      "plans",
      "starter",
      "enterprise",
      "monthly",
      "yearly",
      "price",
      "가격",
      "요금",
      "플랜",
      "구독",
    ])
  ) {
    changeTypes.add("pricing");
  }

  if (
    intersectsWithKeywords(lines, [
      "career",
      "careers",
      "hiring",
      "job",
      "jobs",
      "role",
      "recruit",
      "채용",
      "영입",
      "직무",
    ])
  ) {
    changeTypes.add("hiring");
  }

  if (
    intersectsWithKeywords(lines, [
      "launch",
      "feature",
      "release",
      "product",
      "solution",
      "platform",
      "기능",
      "출시",
      "업데이트",
      "솔루션",
      "서비스",
    ])
  ) {
    changeTypes.add("product");
  }

  if (
    intersectsWithKeywords(lines, [
      "enterprise",
      "secure",
      "trusted",
      "leader",
      "platform",
      "workflow",
      "기업",
      "엔터프라이즈",
      "보안",
      "리더",
      "플랫폼",
    ])
  ) {
    changeTypes.add("messaging");
  }

  if (
    intersectsWithKeywords(lines, [
      "partner",
      "partnership",
      "integration",
      "integrations",
      "alliance",
      "제휴",
      "협력",
      "통합",
    ])
  ) {
    changeTypes.add("partnership");
  }

  return Array.from(changeTypes);
}

function dedupeByKey<T>(items: T[], toKey: (item: T) => string) {
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

function extractPriceCandidate(line: string) {
  const normalized = normalizeBlock(line);
  const symbolMatch = normalized.match(/([$€£])\s?(\d[\d,.]*)/i);
  const unitMatch = normalized.match(/(\d[\d,.]*)\s?(USD|KRW|EUR|달러|원)/i);

  if (!symbolMatch && !unitMatch) {
    return null;
  }

  const amount = symbolMatch ? symbolMatch[2] : unitMatch?.[1] || "";
  const currency = symbolMatch
    ? symbolMatch[1] === "$"
      ? "USD"
      : symbolMatch[1] === "€"
        ? "EUR"
        : "GBP"
    : unitMatch?.[2]?.toUpperCase() || "";
  const value = symbolMatch ? `${symbolMatch[1]}${amount}` : `${amount} ${currency}`.trim();
  const leading = normalized
    .slice(0, (symbolMatch?.index ?? unitMatch?.index ?? 0))
    .replace(/[:\-–]\s*$/, "")
    .replace(/\b(plan|plans|pricing|tier|요금제|플랜)\b/gi, "")
    .trim();
  const plan = leading.split(/\s+/).slice(-3).join(" ").trim() || undefined;

  return {
    raw: normalized,
    value,
    currency,
    plan,
  };
}

function extractPricingChanges(added: string[], removed: string[]) {
  const addedCandidates = added.map(extractPriceCandidate).filter(Boolean) as Array<NonNullable<ReturnType<typeof extractPriceCandidate>>>;
  const removedCandidates = removed.map(extractPriceCandidate).filter(Boolean) as Array<NonNullable<ReturnType<typeof extractPriceCandidate>>>;
  const count = Math.max(addedCandidates.length, removedCandidates.length);

  return dedupeByKey(
    Array.from({ length: count }, (_, index) => ({
      plan: addedCandidates[index]?.plan || removedCandidates[index]?.plan,
      before: removedCandidates[index]?.value,
      after: addedCandidates[index]?.value,
      currency: addedCandidates[index]?.currency || removedCandidates[index]?.currency,
    })).filter((item) => item.before || item.after),
    (item) => `${item.plan || ""}|${item.before || ""}|${item.after || ""}`
  );
}

function messagingCandidate(line: string) {
  const normalized = normalizeBlock(line);
  if (normalized.length < 18 || normalized.length > 120) {
    return false;
  }

  return ![
    /\d[\d,.]*\s?(usd|krw|eur|달러|원)/i,
    /[$€£]\s?\d/i,
    /\b(hiring|채용|job|career|careers|role)\b/i,
    /\b(partner|partnership|integration|integrations|제휴|협력|통합)\b/i,
  ].some((pattern) => pattern.test(normalized));
}

function messageSimilarity(left: string, right: string) {
  const leftTokens = new Set(left.toLowerCase().split(/\s+/).filter(Boolean));
  const rightTokens = new Set(right.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...Array.from(leftTokens), ...Array.from(rightTokens)]).size || 1;
  return intersection / union;
}

function extractMessagingChanges(added: string[], removed: string[]) {
  const addedCandidates = added.filter(messagingCandidate);
  const removedCandidates = removed.filter(messagingCandidate);
  const pairs: Array<{ before: string; after: string }> = [];
  const usedAdded = new Set<number>();

  for (const previous of removedCandidates) {
    let bestIndex = -1;
    let bestScore = 0;

    addedCandidates.forEach((current, index) => {
      if (usedAdded.has(index)) {
        return;
      }

      const score = messageSimilarity(previous, current);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0 && bestScore >= 0.2) {
      usedAdded.add(bestIndex);
      pairs.push({
        before: previous,
        after: addedCandidates[bestIndex],
      });
    }
  }

  if (pairs.length === 0 && addedCandidates[0] && removedCandidates[0]) {
    pairs.push({
      before: removedCandidates[0],
      after: addedCandidates[0],
    });
  }

  return dedupeByKey(pairs, (item) => `${item.before}|${item.after}`).slice(0, 2);
}

function cleanRole(line: string) {
  return normalizeBlock(line)
    .replace(/\b(now hiring|hiring for|we'?re hiring|we are hiring|hiring|careers?|jobs?|roles?)\b/gi, "")
    .replace(/\b(채용|영입|모집)\b/gi, "")
    .replace(/[:\-–]/g, " ")
    .replace(/\b(in|at)\s+[A-Z][a-z]+.*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractHiringChanges(added: string[], removed: string[]) {
  const isHiringLine = (line: string) =>
    /\b(hiring|career|careers|job|jobs|role|roles|채용|영입|모집)\b/i.test(line);

  const addedRoles = dedupeStrings(added.filter(isHiringLine).map(cleanRole).filter(Boolean)).slice(0, 3);
  const removedRoles = dedupeStrings(removed.filter(isHiringLine).map(cleanRole).filter(Boolean)).slice(0, 3);

  return addedRoles.length > 0 || removedRoles.length > 0
    ? [
        {
          addedRoles,
          removedRoles,
        },
      ]
    : [];
}

function cleanPartner(line: string) {
  return normalizeBlock(line)
    .replace(/\b(partner|partners|partnership|integration|integrations|added|with)\b/gi, "")
    .replace(/\b(제휴|협력|통합|추가)\b/gi, "")
    .replace(/[:\-–]/g, " ")
    .replace(/\bfor\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractPartnershipChanges(added: string[], removed: string[]) {
  const isPartnerLine = (line: string) =>
    /\b(partner|partnership|integration|integrations|alliance|제휴|협력|통합)\b/i.test(line);

  const addedPartners = dedupeStrings(added.filter(isPartnerLine).map(cleanPartner).filter(Boolean)).slice(0, 3);
  const removedPartners = dedupeStrings(removed.filter(isPartnerLine).map(cleanPartner).filter(Boolean)).slice(0, 3);

  return addedPartners.length > 0 || removedPartners.length > 0
    ? [
        {
          addedPartners,
          removedPartners,
        },
      ]
    : [];
}

function buildStructuredChanges(
  sourceType: TrackedSourceType,
  changeTypes: string[],
  added: string[],
  removed: string[]
): StructuredChangeSet {
  const structured = createEmptyStructuredChangeSet();

  if (changeTypes.includes("pricing") || sourceType === "pricing") {
    structured.pricing = extractPricingChanges(added, removed);
  }

  if (changeTypes.includes("messaging") || sourceType === "homepage" || sourceType === "product") {
    structured.messaging = extractMessagingChanges(added, removed);
  }

  if (changeTypes.includes("hiring") || sourceType === "careers") {
    structured.hiring = extractHiringChanges(added, removed);
  }

  if (changeTypes.includes("partnership")) {
    structured.partnership = extractPartnershipChanges(added, removed);
  }

  return structured;
}

function buildDiffSummary(
  source: TrackedSource,
  status: SnapshotDiff["status"],
  changeTypes: string[],
  added: string[],
  removed: string[]
) {
  if (status === "initial") {
    return `${source.label} 첫 스냅샷을 저장했습니다.`;
  }

  if (status === "unchanged") {
    return `${source.label}에서 의미 있는 텍스트 변화가 감지되지 않았습니다.`;
  }

  const typeLabel = changeTypes.length > 0 ? changeTypes.join(", ") : "content";
  return `${source.label}에서 ${typeLabel} 관련 변화가 감지됐습니다. 추가 ${added.length}건, 제거 ${removed.length}건입니다.`;
}

export function createStoredSnapshot(
  entityId: string,
  source: TrackedSource,
  fetchResult: PageFetchSuccess
): StoredSnapshot {
  return {
    snapshotId: `${source.id}-${fetchResult.fetchedAt}`,
    entityId,
    sourceId: source.id,
    sourceType: source.type,
    sourceLabel: source.label,
    url: source.url,
    finalUrl: fetchResult.finalUrl,
    title: fetchResult.title,
    metaDescription: fetchResult.metaDescription,
    headings: fetchResult.headings,
    excerpt: fetchResult.excerpt,
    text: fetchResult.text,
    blocks: buildBlocks(fetchResult),
    contentHash: fetchResult.contentHash,
    collectedAt: fetchResult.fetchedAt,
  };
}

export async function loadLatestSnapshot(entityId: string, sourceId: string) {
  return readJsonFile<StoredSnapshot>(getLatestSnapshotPath(entityId, sourceId));
}

export async function saveSnapshot(snapshot: StoredSnapshot, previous: StoredSnapshot | null) {
  if (previous) {
    await writeJsonFile(
      getHistorySnapshotPath(snapshot.entityId, snapshot.sourceId, previous.collectedAt),
      previous
    );
  }

  await writeJsonFile(getLatestSnapshotPath(snapshot.entityId, snapshot.sourceId), snapshot);
}

export function diffSnapshots(
  previous: StoredSnapshot | null,
  current: StoredSnapshot,
  source: TrackedSource
): SnapshotDiff {
  if (!previous) {
    return {
      status: "initial",
      summary: buildDiffSummary(source, "initial", ["initial"], current.blocks.slice(0, 3), []),
      similarity: 0,
      changeTypes: ["initial"],
      added: current.blocks.slice(0, 5),
      removed: [],
      structured: createEmptyStructuredChangeSet(),
      currentSnapshotAt: current.collectedAt,
    };
  }

  if (previous.contentHash === current.contentHash) {
    return {
      status: "unchanged",
      summary: buildDiffSummary(source, "unchanged", [], [], []),
      similarity: 1,
      changeTypes: [],
      added: [],
      removed: [],
      structured: createEmptyStructuredChangeSet(),
      previousSnapshotAt: previous.collectedAt,
      currentSnapshotAt: current.collectedAt,
    };
  }

  const previousSet = new Set(previous.blocks);
  const currentSet = new Set(current.blocks);
  const added = current.blocks.filter((item) => !previousSet.has(item)).slice(0, 8);
  const removed = previous.blocks.filter((item) => !currentSet.has(item)).slice(0, 8);
  const intersection = current.blocks.filter((item) => previousSet.has(item)).length;
  const union = new Set([...previous.blocks, ...current.blocks]).size || 1;
  const similarity = round(intersection / union);
  const changeTypes = inferChangeTypes(source.type, added, removed);
  const structured = buildStructuredChanges(source.type, changeTypes, added, removed);

  return {
    status: "changed",
    summary: buildDiffSummary(source, "changed", changeTypes, added, removed),
    similarity,
    changeTypes,
    added,
    removed,
    structured,
    previousSnapshotAt: previous.collectedAt,
    currentSnapshotAt: current.collectedAt,
  };
}
