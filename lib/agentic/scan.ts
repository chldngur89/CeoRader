import path from "path";

import { fetchTrackedSource } from "@/lib/agentic/playwright-fetcher";
import { createStoredSnapshot, diffSnapshots, loadLatestSnapshot, saveSnapshot } from "@/lib/agentic/snapshot-store";
import {
  AGENTIC_ROOT,
  writeJsonFile,
} from "@/lib/agentic/storage";
import {
  ensureSourceRegistry,
  type ManualTrackedSourceInput,
  type TrackedEntityRegistry,
  type TrackedSource,
} from "@/lib/agentic/source-registry";

export interface AgenticSourceScanResult {
  source: TrackedSource;
  fetch: {
    status: "success" | "error";
    fetchedAt: string;
    finalUrl?: string;
    title?: string;
    excerpt?: string;
    contentHash?: string;
    httpStatus?: number | null;
    attemptedUrls: string[];
    error?: string;
  };
  diff?: ReturnType<typeof diffSnapshots>;
}

export interface AgenticScanResult {
  runId: string;
  engine: "agentic-radar";
  company: string;
  entityId: string;
  website: string;
  registry: Pick<TrackedEntityRegistry, "updatedAt" | "sources">;
  summary: {
    visited: number;
    changed: number;
    unchanged: number;
    initial: number;
    errors: number;
    changeTypes: string[];
  };
  changedSources: Array<{
    sourceId: string;
    label: string;
    type: string;
    summary: string;
    changeTypes: string[];
  }>;
  results: AgenticSourceScanResult[];
  timestamp: string;
}

type AgenticScanInput = {
  company: string;
  website?: string;
  includeDefaults?: boolean;
  manualSources?: ManualTrackedSourceInput[];
  sourceLimit?: number;
};

const RUN_DIR = path.join(AGENTIC_ROOT, "runs");

function getRunPath(entityId: string, runId: string) {
  return path.join(RUN_DIR, entityId, `${runId}.json`);
}

export async function runAgenticScan({
  company,
  website,
  includeDefaults = true,
  manualSources = [],
  sourceLimit = 6,
}: AgenticScanInput): Promise<AgenticScanResult> {
  const registry = await ensureSourceRegistry({
    company,
    website,
    includeDefaults,
    manualSources,
  });

  const activeSources = registry.sources
    .filter((item) => item.isActive)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(1, sourceLimit));

  const runId = `${registry.entityId}-${Date.now()}`;
  const results: AgenticSourceScanResult[] = [];
  const changeTypes = new Set<string>();

  for (const source of activeSources) {
    const fetchResult = await fetchTrackedSource(source);

    if (fetchResult.status === "error") {
      results.push({
        source,
        fetch: {
          status: "error",
          fetchedAt: fetchResult.fetchedAt,
          attemptedUrls: fetchResult.attemptedUrls,
          error: fetchResult.error,
        },
      });
      continue;
    }

    const previousSnapshot = await loadLatestSnapshot(registry.entityId, source.id);
    const currentSnapshot = createStoredSnapshot(registry.entityId, source, fetchResult);
    const diff = diffSnapshots(previousSnapshot, currentSnapshot, source);
    await saveSnapshot(currentSnapshot, previousSnapshot);

    diff.changeTypes.forEach((item) => changeTypes.add(item));

    results.push({
      source,
      fetch: {
        status: "success",
        fetchedAt: fetchResult.fetchedAt,
        finalUrl: fetchResult.finalUrl,
        title: fetchResult.title,
        excerpt: fetchResult.excerpt,
        contentHash: fetchResult.contentHash,
        httpStatus: fetchResult.httpStatus,
        attemptedUrls: fetchResult.attemptedUrls,
      },
      diff,
    });
  }

  const summary = {
    visited: results.filter((item) => item.fetch.status === "success").length,
    changed: results.filter((item) => item.diff?.status === "changed").length,
    unchanged: results.filter((item) => item.diff?.status === "unchanged").length,
    initial: results.filter((item) => item.diff?.status === "initial").length,
    errors: results.filter((item) => item.fetch.status === "error").length,
    changeTypes: Array.from(changeTypes),
  };

  const payload: AgenticScanResult = {
    runId,
    engine: "agentic-radar",
    company: registry.company,
    entityId: registry.entityId,
    website: registry.website,
    registry: {
      updatedAt: registry.updatedAt,
      sources: registry.sources,
    },
    summary,
    changedSources: results
      .filter((item) => item.diff?.status === "changed")
      .map((item) => ({
        sourceId: item.source.id,
        label: item.source.label,
        type: item.source.type,
        summary: item.diff?.summary || "",
        changeTypes: item.diff?.changeTypes || [],
      })),
    results,
    timestamp: new Date().toISOString(),
  };

  await writeJsonFile(getRunPath(registry.entityId, runId), payload);
  return payload;
}
