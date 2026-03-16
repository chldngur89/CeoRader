import { readdir } from "fs/promises";
import path from "path";

import { loadLatestSnapshot } from "@/lib/agentic/snapshot-store";
import { ensureSourceRegistry, loadSourceRegistry } from "@/lib/agentic/source-registry";
import { AGENTIC_ROOT, readJsonFile, toSlug } from "@/lib/agentic/storage";
import type { AgenticScanResult } from "@/lib/agentic/scan";
import type {
  ControlRoomCompanyStatus,
  ControlRoomLatestRun,
  ControlRoomOverview,
  ControlRoomResponse,
  ControlRoomSourceStatus,
} from "@/lib/app/control-room";
import type { TrackedCompany } from "@/lib/app/state";

const RUN_DIR = path.join(AGENTIC_ROOT, "runs");

async function listRunPayloads(entityId: string) {
  const runDir = path.join(RUN_DIR, entityId);

  try {
    const entries = await readdir(runDir, { withFileTypes: true });
    const payloads = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => readJsonFile<AgenticScanResult>(path.join(runDir, entry.name)))
    );

    return payloads
      .filter((payload): payload is AgenticScanResult => !!payload)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function mapRun(payload: AgenticScanResult): ControlRoomLatestRun {
  return {
    runId: payload.runId,
    company: payload.company,
    timestamp: payload.timestamp,
    summary: payload.summary,
    changedSources: payload.changedSources,
  };
}

function buildPendingSourceStatus(source: ControlRoomSourceStatus): ControlRoomSourceStatus {
  if (!source.hasSnapshot && source.lastStatus === "pending") {
    return {
      ...source,
      lastSummary: `${source.label} 아직 수집 전입니다.`,
    };
  }

  return source;
}

async function loadCompanyStatus(input: TrackedCompany): Promise<{
  companyStatus: ControlRoomCompanyStatus;
  runs: ControlRoomLatestRun[];
}> {
  const company = input.name.trim();
  const website = input.website.trim();
  const entityId = toSlug(company);

  const registry =
    company.length > 0 && website.length > 0
      ? await ensureSourceRegistry({
          company,
          website,
          includeDefaults: true,
        })
      : await loadSourceRegistry(company);

  const runs = await listRunPayloads(registry?.entityId || entityId);
  const latestRun = runs[0] || null;

  const sources = await Promise.all(
    (registry?.sources || []).map(async (source): Promise<ControlRoomSourceStatus> => {
      const snapshot = await loadLatestSnapshot(registry?.entityId || entityId, source.id);
      const latestResult = latestRun?.results.find((item) => item.source.id === source.id);

      const status: ControlRoomSourceStatus = {
        id: source.id,
        label: source.label,
        type: source.type,
        url: source.url,
        isActive: source.isActive,
        tags: source.tags,
        hasSnapshot: !!snapshot,
        snapshotAt: snapshot?.collectedAt || null,
        finalUrl:
          latestResult?.fetch.status === "success"
            ? latestResult.fetch.finalUrl || snapshot?.finalUrl || null
            : snapshot?.finalUrl || null,
        lastStatus:
          latestResult?.fetch.status === "error"
            ? "error"
            : latestResult?.diff?.status || (snapshot ? "unchanged" : "pending"),
        lastSummary:
          latestResult?.fetch.status === "error"
            ? latestResult.fetch.error || `${source.label} 수집 중 오류가 발생했습니다.`
            : latestResult?.diff?.summary || "",
        attemptedUrls: latestResult?.fetch.attemptedUrls || source.candidateUrls,
        error: latestResult?.fetch.status === "error" ? latestResult.fetch.error || null : null,
      };

      return buildPendingSourceStatus(status);
    })
  );

  const companyStatus: ControlRoomCompanyStatus = {
    company,
    website: registry?.website || website,
    entityId: registry?.entityId || entityId,
    registryUpdatedAt: registry?.updatedAt || null,
    stats: {
      totalSources: registry?.sources.length || 0,
      activeSources: registry?.sources.filter((item) => item.isActive).length || 0,
      sourcesWithSnapshots: sources.filter((item) => item.hasSnapshot).length,
      changedSources: latestRun?.summary.changed || 0,
      initialSources: latestRun?.summary.initial || 0,
      errorSources: latestRun?.summary.errors || 0,
    },
    latestRun: latestRun ? mapRun(latestRun) : null,
    sources,
  };

  return {
    companyStatus,
    runs: runs.map(mapRun),
  };
}

function dedupeTrackedCompanies(items: TrackedCompany[]) {
  const map = new Map<string, TrackedCompany>();

  for (const item of items) {
    const company = item.name.trim();
    const website = item.website.trim();

    if (!company) {
      continue;
    }

    const key = `${company.toLowerCase()}|${website.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        id: item.id,
        name: company,
        website,
      });
    }
  }

  return Array.from(map.values());
}

function buildOverview(companies: ControlRoomCompanyStatus[], recentRuns: ControlRoomLatestRun[]): ControlRoomOverview {
  return {
    trackedCompanies: companies.length,
    activeCompanies: companies.filter((item) => item.stats.activeSources > 0).length,
    activeSources: companies.reduce((sum, item) => sum + item.stats.activeSources, 0),
    sourcesWithSnapshots: companies.reduce((sum, item) => sum + item.stats.sourcesWithSnapshots, 0),
    changedCompanies: companies.filter((item) => (item.latestRun?.summary.changed || 0) > 0).length,
    companiesWithErrors: companies.filter((item) => (item.latestRun?.summary.errors || 0) > 0).length,
    recentRuns: recentRuns.length,
  };
}

export async function buildAgenticControlRoom(trackedCompanies: TrackedCompany[]): Promise<ControlRoomResponse> {
  const normalizedCompanies = dedupeTrackedCompanies(trackedCompanies);
  const results = await Promise.all(normalizedCompanies.map((item) => loadCompanyStatus(item)));
  const companies = results.map((item) => item.companyStatus);
  const recentRuns = results
    .flatMap((item) => item.runs)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    overview: buildOverview(companies, recentRuns),
    companies,
    recentRuns,
  };
}
