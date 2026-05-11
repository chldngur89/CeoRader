"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import type { ControlRoomResponse } from "@/lib/app/control-room";
import { buildSiteFacts, type ExtractedFact } from "@/lib/app/intelligence";
import {
  formatRelativeTime,
  trackedCompaniesSignature,
  type CachedRadarResponse,
  type RadarResponse,
} from "@/lib/app/radar-cache";
import { formatStructuredHighlights } from "@/lib/app/structured-change";
import {
  STORAGE_KEYS,
  hasConfiguredTrackedCompanies,
  normalizeOnboardingData,
  type OnboardingData,
} from "@/lib/app/state";
import type { AgenticScanResult, AgenticSourceScanResult } from "@/lib/agentic/scan";

type RunDetailPayload = {
  success: boolean;
  run: AgenticScanResult;
};

function formatFact(fact: ExtractedFact) {
  if (fact.beforeValue && fact.afterValue) {
    return `${fact.kind} ${fact.beforeValue} -> ${fact.afterValue}`;
  }

  if (fact.afterValue) {
    return `${fact.kind} ${fact.afterValue}`;
  }

  return `${fact.kind} ${fact.value}`;
}

function factsForResult(company: string, result: AgenticSourceScanResult) {
  if (result.fetch.status !== "success" || !result.diff) {
    return [];
  }

  return buildSiteFacts({
    id: `${company}-${result.source.id}`,
    company,
    sourceType: result.source.type,
    title: result.fetch.title || result.source.label,
    summary: result.diff.summary,
    source: result.source.label,
    link: result.fetch.finalUrl || result.source.url,
    pubDate: result.fetch.fetchedAt,
    changeTypes: result.diff.changeTypes,
    structured: result.diff.structured,
    added: result.diff.added,
    removed: result.diff.removed,
  }).slice(0, 4);
}

export default function ScanLogPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [controlRoom, setControlRoom] = useState<ControlRoomResponse | null>(null);
  const [radar, setRadar] = useState<CachedRadarResponse | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<AgenticScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (!raw) {
      setLoading(false);
      return;
    }

    const parsed = normalizeOnboardingData(JSON.parse(raw));
    setData(parsed);

    const cachedRadar = localStorage.getItem(STORAGE_KEYS.radarCache);
    if (cachedRadar) {
      try {
        setRadar(JSON.parse(cachedRadar) as CachedRadarResponse);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.radarCache);
      }
    }

    void loadControlRoom(parsed);
  }, []);

  async function loadControlRoom(onboarding: OnboardingData) {
    try {
      setError(null);
      const response = await fetch("/api/agentic/control-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: onboarding.companyName,
          companyWebsite: onboarding.companyWebsite,
          trackedCompanies: onboarding.trackedCompanies,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "스캔 로그를 불러오지 못했습니다.");
      }

      const nextControlRoom = payload as ControlRoomResponse;
      setControlRoom(nextControlRoom);

      if (!selectedRunId && nextControlRoom.recentRuns[0]) {
        const initialRun = nextControlRoom.recentRuns[0];
        const entityId =
          nextControlRoom.companies.find((company) => company.company === initialRun.company)?.entityId || "";

        if (entityId) {
          setSelectedRunId(initialRun.runId);
          void loadRunDetail(entityId, initialRun.runId);
        }
      }
    } catch (requestError: any) {
      setError(requestError.message || "스캔 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRunDetail(entityId: string, runId: string) {
    try {
      setDetailLoading(true);
      const response = await fetch(
        `/api/agentic/run?entityId=${encodeURIComponent(entityId)}&runId=${encodeURIComponent(runId)}`
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "런 상세를 불러오지 못했습니다.");
      }

      setSelectedRunId(runId);
      setRunDetail((payload as RunDetailPayload).run);
    } catch (requestError: any) {
      setError(requestError.message || "런 상세를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function runScan() {
    if (!data || !hasConfiguredTrackedCompanies(data)) {
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const response = await fetch("/api/agentic/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName,
          companyWebsite: data.companyWebsite,
          description: data.description,
          goals: data.goals,
          keywords: data.keywords,
          trackedCompanies: data.trackedCompanies,
          sourceLimit: 4,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "스캔 실행에 실패했습니다.");
      }

      const nextRadar = payload as RadarResponse;
      const cached: CachedRadarResponse = {
        ...nextRadar,
        trackedCompaniesSignature: trackedCompaniesSignature(data.trackedCompanies),
      };
      localStorage.setItem(STORAGE_KEYS.radarCache, JSON.stringify(cached));
      setRadar(cached);

      await loadControlRoom(data);
    } catch (scanError: any) {
      setError(scanError.message || "스캔 실행에 실패했습니다.");
    } finally {
      setScanning(false);
    }
  }

  const relatedEvents = useMemo(() => {
    if (!runDetail || !radar?.events) {
      return [];
    }

    return radar.events.filter((event) => event.company === runDetail.company).slice(0, 4);
  }, [radar, runDetail]);

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-custom tracking-tight">런 리뷰</h1>
            <p className="text-sm text-slate-500 mt-1">
              run 선택, source별 diff, extracted fact, 연결 이벤트를 함께 검토합니다.
            </p>
          </div>
          {data && hasConfiguredTrackedCompanies(data) && (
            <button
              onClick={runScan}
              disabled={scanning}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              {scanning ? "스캔 중..." : "지금 실행"}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        {!data ? (
          <EmptyPanel />
        ) : (
          <>
            <section className="grid grid-cols-4 gap-3">
              <Metric label="런 수" value={String(controlRoom?.overview.recentRuns || 0)} />
              <Metric label="활성 회사" value={String(controlRoom?.overview.activeCompanies || 0)} />
              <Metric label="이벤트" value={String(radar?.events.length || 0)} />
              <Metric label="에러 회사" value={String(controlRoom?.overview.companiesWithErrors || 0)} />
            </section>

            {loading ? (
              <LoadingState />
            ) : error ? (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : (
              <section className="space-y-4">
                {controlRoom?.recentRuns.length ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Recent Runs
                      </p>
                      {controlRoom.recentRuns.map((run) => {
                        const entityId =
                          controlRoom.companies.find((company) => company.company === run.company)?.entityId || "";
                        const selected = selectedRunId === run.runId;

                        return (
                          <button
                            key={run.runId}
                            onClick={() => entityId && loadRunDetail(entityId, run.runId)}
                            className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-colors ${
                              selected
                                ? "border-navy-custom bg-slate-900 text-white"
                                : "border-slate-100 bg-white text-slate-900"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h2 className="text-base font-bold">{run.company}</h2>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      selected ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {formatRelativeTime(run.timestamp)}
                                  </span>
                                </div>
                                <p className={`mt-2 text-sm ${selected ? "text-white/75" : "text-slate-600"}`}>
                                  방문 {run.summary.visited} · 변화 {run.summary.changed} · 초기 {run.summary.initial} · 에러{" "}
                                  {run.summary.errors}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-xl font-bold ${selected ? "text-white" : "text-navy-custom"}`}>
                                  {run.summary.changed}
                                </p>
                                <p className={`text-[10px] ${selected ? "text-white/60" : "text-slate-400"}`}>
                                  changed
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      {detailLoading ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                          <p className="mt-3 text-sm text-slate-500">런 상세를 불러오는 중입니다.</p>
                        </div>
                      ) : runDetail ? (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                Selected Run
                              </p>
                              <h2 className="mt-2 text-lg font-bold text-slate-900">{runDetail.company}</h2>
                              <p className="mt-1 text-sm text-slate-500">
                                {new Date(runDetail.timestamp).toLocaleString("ko-KR")} · runId {runDetail.runId}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <MiniMetric label="방문" value={String(runDetail.summary.visited)} />
                              <MiniMetric label="변화" value={String(runDetail.summary.changed)} />
                              <MiniMetric label="초기" value={String(runDetail.summary.initial)} />
                              <MiniMetric label="에러" value={String(runDetail.summary.errors)} />
                            </div>
                          </div>

                          {relatedEvents.length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                Detected Events
                              </p>
                              <div className="mt-2 space-y-2">
                                {relatedEvents.map((event) => (
                                  <div key={event.id} className="rounded-xl bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                                      <span className="text-xs font-bold text-slate-500">{event.importance}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">{event.summary}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                              Source Diff Review
                            </p>
                            <div className="mt-2 space-y-3">
                              {runDetail.results.map((result) => {
                                const facts = factsForResult(runDetail.company, result);
                                const structuredHighlights =
                                  result.diff?.structured ? formatStructuredHighlights(result.diff.structured, 4) : [];
                                const status =
                                  result.fetch.status === "error"
                                    ? "error"
                                    : result.diff?.status || "unchanged";

                                return (
                                  <div key={result.source.id} className="rounded-xl bg-slate-50 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-semibold text-slate-800">
                                            {result.source.label} <span className="text-slate-400">· {result.source.type}</span>
                                          </p>
                                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                            {status}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                          {result.fetch.status === "success"
                                            ? result.diff?.summary || "변화 없음"
                                            : result.fetch.error || "수집 실패"}
                                        </p>
                                      </div>
                                      <a
                                        href={
                                          result.fetch.status === "success"
                                            ? result.fetch.finalUrl || result.source.url
                                            : result.source.url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"
                                      >
                                        원문
                                      </a>
                                    </div>

                                    {facts.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {facts.map((fact) => (
                                          <span
                                            key={fact.id}
                                            className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700"
                                          >
                                            {formatFact(fact)}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {structuredHighlights.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {structuredHighlights.map((item) => (
                                          <span
                                            key={`${result.source.id}-${item}`}
                                            className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                                          >
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {result.diff?.added.length ? (
                                      <div className="mt-3 rounded-xl bg-green-50 p-3">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-green-700">
                                          Added
                                        </p>
                                        <ul className="mt-2 space-y-1 text-sm text-green-900">
                                          {result.diff.added.slice(0, 3).map((line) => (
                                            <li key={line}>{line}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : null}

                                    {result.diff?.removed.length ? (
                                      <div className="mt-3 rounded-xl bg-rose-50 p-3">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-rose-700">
                                          Removed
                                        </p>
                                        <ul className="mt-2 space-y-1 text-sm text-rose-900">
                                          {result.diff.removed.slice(0, 3).map((line) => (
                                            <li key={line}>{line}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : null}

                                    <p className="mt-3 text-[11px] text-slate-400">
                                      시도한 URL {result.fetch.attemptedUrls.length}개
                                      {result.diff?.previousSnapshotAt
                                        ? ` · 이전 ${formatRelativeTime(result.diff.previousSnapshotAt)}`
                                        : ""}
                                      {result.diff?.currentSnapshotAt
                                        ? ` · 현재 ${formatRelativeTime(result.diff.currentSnapshotAt)}`
                                        : ""}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                          런을 선택하면 source별 before/after diff와 추출된 fact를 확인할 수 있습니다.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-800">아직 실행된 런이 없습니다</p>
                    <p className="mt-2 text-xs text-slate-500">
                      첫 스캔을 실행하면 공식 사이트 방문 기록과 변화 요약이 이곳에 저장됩니다.
                    </p>
                  </div>
                )}
              </section>
            )}

            <section className="grid grid-cols-2 gap-3">
              <Shortcut href="/signals" title="시장 신호" description="최신 event와 signal 근거를 봅니다." />
              <Shortcut href="/evaluation" title="레이더 건강도" description="커버리지와 에러 소스를 점검합니다." />
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </MobileContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-sm font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      <p className="mt-3 text-sm text-slate-500">스캔 로그를 불러오는 중입니다.</p>
    </div>
  );
}

function Shortcut({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">온보딩이 먼저 필요합니다</p>
      <p className="mt-2 text-xs text-slate-500">
        추적 회사와 웹사이트를 등록해야 런 리뷰가 생성됩니다.
      </p>
      <Link
        href="/onboarding"
        className="mt-4 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
      >
        온보딩 열기
      </Link>
    </div>
  );
}
