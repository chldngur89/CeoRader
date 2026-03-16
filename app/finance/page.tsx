"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import {
  trackedCompaniesSignature,
  type CachedRadarResponse,
  type RadarResponse,
  type RadarSignal,
} from "@/lib/app/radar-cache";
import { STORAGE_KEYS, hasConfiguredTrackedCompanies, normalizeOnboardingData, type OnboardingData } from "@/lib/app/state";
import { normalizeVaultItems } from "@/lib/app/vault";

export default function PriorityBoardPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [radar, setRadar] = useState<RadarResponse | null>(null);
  const [vaultCount, setVaultCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (!raw) {
      setLoading(false);
      return;
    }

    const parsed = normalizeOnboardingData(JSON.parse(raw));
    setData(parsed);

    const rawVault = localStorage.getItem(STORAGE_KEYS.vault);
    if (rawVault) {
      setVaultCount(normalizeVaultItems(JSON.parse(rawVault)).length);
    }

    const cachedRadar = localStorage.getItem(STORAGE_KEYS.radarCache);
    if (cachedRadar) {
      try {
        const parsedRadar = JSON.parse(cachedRadar) as CachedRadarResponse;
        setRadar(parsedRadar);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEYS.radarCache);
      }
    }

    if (hasConfiguredTrackedCompanies(parsed)) {
      void refreshRadar(parsed);
    } else {
      setLoading(false);
    }
  }, []);

  async function refreshRadar(current = data) {
    if (!current || !hasConfiguredTrackedCompanies(current)) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch("/api/agentic/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: current.companyName,
          companyWebsite: current.companyWebsite,
          description: current.description,
          goals: current.goals,
          keywords: current.keywords,
          trackedCompanies: current.trackedCompanies,
          sourceLimit: 4,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "우선순위 보드를 만들지 못했습니다.");
      }

      const nextRadar = payload as RadarResponse;
      setRadar(nextRadar);

      const cached: CachedRadarResponse = {
        ...nextRadar,
        trackedCompaniesSignature: trackedCompaniesSignature(current.trackedCompanies),
      };
      localStorage.setItem(STORAGE_KEYS.radarCache, JSON.stringify(cached));
    } catch (requestError: any) {
      setError(requestError.message || "우선순위 보드를 만들지 못했습니다.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  const topSignals = useMemo(
    () => [...(radar?.signals || [])].sort((left, right) => right.importance - left.importance).slice(0, 5),
    [radar]
  );

  const companyScores = useMemo(() => {
    const scores = new Map<string, number>();
    for (const signal of radar?.signals || []) {
      scores.set(signal.company, (scores.get(signal.company) || 0) + signal.importance);
    }

    return Array.from(scores.entries())
      .map(([company, score]) => ({ company, score }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }, [radar]);

  const opportunities = (radar?.signals || []).filter((signal) => signal.category === "opportunity").length;
  const threats = (radar?.signals || []).filter((signal) => signal.category === "threat").length;
  const trends = (radar?.signals || []).filter((signal) => signal.category === "trend").length;
  const avgPriority =
    radar && radar.signals.length > 0
      ? Math.round(radar.signals.reduce((sum, signal) => sum + signal.importance, 0) / radar.signals.length)
      : 0;

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-custom tracking-tight">우선순위 보드</h1>
            <p className="text-sm text-slate-500 mt-1">
              변화 강도와 실행 우선순위를 한 화면에서 정렬합니다.
            </p>
          </div>
          {data && hasConfiguredTrackedCompanies(data) && (
            <button
              onClick={() => refreshRadar()}
              disabled={refreshing}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              {refreshing ? "갱신 중..." : "갱신"}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        {!data ? (
          <EmptyState />
        ) : (
          <>
            <section className="grid grid-cols-4 gap-3">
              <Metric label="평균 우선순위" value={String(avgPriority)} />
              <Metric label="기회" value={String(opportunities)} />
              <Metric label="위협" value={String(threats)} />
              <Metric label="저장 항목" value={String(vaultCount)} />
            </section>

            {loading ? (
              <LoadingState />
            ) : error ? (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : radar ? (
              <>
                <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-600 p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/70">Priority Summary</p>
                  <h2 className="mt-2 text-2xl font-bold">{radar.overview.headline}</h2>
                  <p className="mt-3 text-sm text-white/80">{radar.overview.summary}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <PriorityMini label="트렌드" value={String(trends)} />
                    <PriorityMini label="스캔 회사" value={String(radar.overview.scannedCompanies)} />
                    <PriorityMini label="에러" value={String(radar.overview.errors)} />
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Top Signals
                    </h2>
                    <Link href="/signals" className="text-xs font-semibold text-primary">
                      전체 보기
                    </Link>
                  </div>

                  {topSignals.map((signal, index) => (
                    <SignalRow key={signal.id} rank={index + 1} signal={signal} />
                  ))}

                  {topSignals.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      아직 우선순위를 매길 신호가 없습니다. 첫 스캔을 돌리면 이 보드가 채워집니다.
                    </div>
                  )}
                </section>

                <section className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900">회사별 집중도</h2>
                    <div className="mt-4 space-y-3">
                      {companyScores.map((item) => {
                        const width = Math.max(8, Math.min(100, Math.round((item.score / (topSignals[0]?.importance || 100)) * 32)));
                        return (
                          <div key={item.company}>
                            <div className="mb-1 flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-700">{item.company}</p>
                              <span className="text-xs text-slate-400">{item.score}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100">
                              <div className="h-2 rounded-full bg-navy-custom" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900">즉시 실행안</h2>
                    <div className="mt-4 space-y-3">
                      {radar.overview.actions.map((action, index) => (
                        <div key={action} className="rounded-xl bg-slate-50 px-3 py-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Action {index + 1}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                공식 사이트가 등록되면 우선순위 보드가 생성됩니다.
              </div>
            )}
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

function PriorityMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-white/70">{label}</p>
    </div>
  );
}

function SignalRow({ rank, signal }: { rank: number; signal: RadarSignal }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
              #{rank}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {signal.company}
            </span>
            <span className="text-[10px] text-slate-400">{signal.category}</span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-slate-900">{signal.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{signal.recommendation}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-navy-custom">{signal.importance}</p>
          <p className="text-[10px] text-slate-400">priority</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">추적 대상을 먼저 설정하세요</p>
      <p className="mt-2 text-xs text-slate-500">
        설정에 경쟁사와 공식 사이트를 입력해야 우선순위 보드가 만들어집니다.
      </p>
      <Link
        href="/config"
        className="mt-4 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
      >
        설정 열기
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      <p className="mt-3 text-sm text-slate-500">우선순위 보드를 계산하는 중입니다.</p>
    </div>
  );
}
