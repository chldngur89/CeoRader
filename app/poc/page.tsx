"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import type { ControlRoomResponse } from "@/lib/app/control-room";
import {
  trackedCompaniesSignature,
  type CachedRadarResponse,
  type RadarResponse,
} from "@/lib/app/radar-cache";
import {
  STORAGE_KEYS,
  hasConfiguredTrackedCompanies,
  normalizeOnboardingData,
  type OnboardingData,
} from "@/lib/app/state";

export default function ScanLogPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [controlRoom, setControlRoom] = useState<ControlRoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (!raw) {
      setLoading(false);
      return;
    }

    const parsed = normalizeOnboardingData(JSON.parse(raw));
    setData(parsed);
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

      setControlRoom(payload as ControlRoomResponse);
    } catch (requestError: any) {
      setError(requestError.message || "스캔 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
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

      const radar = payload as RadarResponse;
      const cached: CachedRadarResponse = {
        ...radar,
        trackedCompaniesSignature: trackedCompaniesSignature(data.trackedCompanies),
      };
      localStorage.setItem(STORAGE_KEYS.radarCache, JSON.stringify(cached));

      await loadControlRoom(data);
    } catch (scanError: any) {
      setError(scanError.message || "스캔 실행에 실패했습니다.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-custom tracking-tight">스캔 로그</h1>
            <p className="text-sm text-slate-500 mt-1">
              agentic search 런 이력과 소스별 diff 결과를 기록합니다.
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
              <Metric label="변화 회사" value={String(controlRoom?.overview.changedCompanies || 0)} />
              <Metric label="에러 회사" value={String(controlRoom?.overview.companiesWithErrors || 0)} />
            </section>

            {loading ? (
              <LoadingState />
            ) : error ? (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : (
              <section className="space-y-3">
                {controlRoom?.recentRuns.length ? (
                  controlRoom.recentRuns.map((run) => (
                    <div key={run.runId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">{run.company}</h2>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {new Date(run.timestamp).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            방문 {run.summary.visited} · 변화 {run.summary.changed} · 초기 {run.summary.initial} · 에러{" "}
                            {run.summary.errors}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-navy-custom">{run.summary.changed}</p>
                          <p className="text-[10px] text-slate-400">changed</p>
                        </div>
                      </div>

                      {run.changedSources.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {run.changedSources.slice(0, 3).map((source) => (
                            <div key={source.sourceId} className="rounded-xl bg-slate-50 px-3 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800">
                                  {source.label} <span className="text-slate-400">· {source.type}</span>
                                </p>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  {source.changeTypes.join(", ") || "change"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{source.summary}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                          이번 런에서는 새로 감지된 diff가 없습니다.
                        </div>
                      )}
                    </div>
                  ))
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
              <Shortcut href="/signals" title="시장 신호" description="최신 signal 카드와 근거 diff를 봅니다." />
              <Shortcut href="/evaluation" title="레이더 건강도" description="추적 준비 상태와 에러율을 점검합니다." />
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
        추적 회사와 웹사이트를 등록해야 스캔 로그가 생성됩니다.
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
