"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import type { ControlRoomResponse } from "@/lib/app/control-room";
import { formatRelativeTime } from "@/lib/app/radar-cache";
import { STORAGE_KEYS, normalizeOnboardingData, type OnboardingData } from "@/lib/app/state";

const GOAL_LABELS: Record<string, string> = {
  market: "시장 확장",
  innov: "혁신 리더십",
  ops: "운영 효율성",
  comp: "경쟁 우위",
  cust: "고객 유지",
};

const STATUS_STYLE = {
  changed: "bg-amber-100 text-amber-700",
  initial: "bg-blue-100 text-blue-700",
  unchanged: "bg-slate-100 text-slate-600",
  error: "bg-rose-100 text-rose-700",
  pending: "bg-slate-100 text-slate-400",
} as const;

export default function CompanyBriefPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [controlRoom, setControlRoom] = useState<ControlRoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
        throw new Error(payload.message || payload.error || "리서치 브리프를 불러오지 못했습니다.");
      }

      setControlRoom(payload as ControlRoomResponse);
    } catch (requestError: any) {
      setError(requestError.message || "리서치 브리프를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">리서치 브리프</h1>
        <p className="text-sm text-slate-500 mt-1">
          무엇을 추적하는지와 현재 소스 커버리지를 한 화면에서 봅니다.
        </p>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        {!data ? (
          <EmptyState
            title="온보딩 데이터가 없습니다"
            description="회사 정보와 추적 대상을 먼저 설정해야 브리프가 만들어집니다."
          />
        ) : (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">Company Thesis</p>
                  <h2 className="mt-2 text-2xl font-bold">{data.companyName || "우리 회사"}</h2>
                  {data.companyWebsite && <p className="mt-2 text-sm text-white/70">{data.companyWebsite}</p>}
                </div>
                <Link
                  href="/config"
                  className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                >
                  설정 수정
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/80">
                {data.description || "회사 설명이 아직 없습니다. 설정에서 리서치 관점을 입력하세요."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.goals.length > 0 ? (
                  data.goals.map((goal) => (
                    <span
                      key={goal}
                      className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white"
                    >
                      {GOAL_LABELS[goal] || goal}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
                    전략 목표 미설정
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.keywords.length > 0 ? (
                  data.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-semibold text-blue-100"
                    >
                      {keyword}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
                    키워드 미설정
                  </span>
                )}
              </div>
            </section>

            <section className="grid grid-cols-4 gap-3">
              <MetricCard label="추적 회사" value={String(controlRoom?.overview.trackedCompanies || 0)} />
              <MetricCard label="활성 소스" value={String(controlRoom?.overview.activeSources || 0)} />
              <MetricCard label="스냅샷" value={String(controlRoom?.overview.sourcesWithSnapshots || 0)} />
              <MetricCard label="변화 회사" value={String(controlRoom?.overview.changedCompanies || 0)} />
            </section>

            {loading ? (
              <LoadingState label="공식 사이트 커버리지를 불러오는 중입니다." />
            ) : error ? (
              <InlineError message={error} />
            ) : (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Source Coverage
                  </h2>
                  {controlRoom?.generatedAt && (
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(controlRoom.generatedAt)}
                    </span>
                  )}
                </div>

                {controlRoom?.companies.map((company) => {
                  const isOwnCompany = company.company === data.companyName;
                  return (
                    <div key={company.entityId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{company.company}</h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isOwnCompany ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isOwnCompany ? "우리 회사" : "추적 대상"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{company.website}</p>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <p>{company.stats.activeSources} active</p>
                          <p>{company.stats.sourcesWithSnapshots} snapshots</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <MiniMetric label="변화" value={String(company.stats.changedSources)} />
                        <MiniMetric label="기준선" value={String(company.stats.initialSources)} />
                        <MiniMetric label="에러" value={String(company.stats.errorSources)} />
                      </div>

                      {company.latestRun ? (
                        <p className="mt-4 text-xs text-slate-500">
                          최근 스캔 {formatRelativeTime(company.latestRun.timestamp)} · {company.latestRun.summary.visited}개
                          소스 방문
                        </p>
                      ) : (
                        <p className="mt-4 text-xs text-slate-400">아직 스캔 이력이 없습니다.</p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {company.sources.map((source) => (
                          <span
                            key={source.id}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[source.lastStatus]}`}
                          >
                            {source.label}
                          </span>
                        ))}
                      </div>

                      {company.sources.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {company.sources.slice(0, 3).map((source) => (
                            <div key={source.id} className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800">
                                  {source.label} <span className="text-slate-400">· {source.type}</span>
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[source.lastStatus]}`}
                                >
                                  {source.lastStatus}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{source.lastSummary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            <section className="grid grid-cols-2 gap-3">
              <ShortcutCard
                href="/customers"
                title="워치리스트"
                description="회사별 최신 신호와 우선순위를 봅니다."
              />
              <ShortcutCard
                href="/evaluation"
                title="레이더 건강도"
                description="추적 상태가 어디까지 준비됐는지 점검합니다."
              />
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </MobileContainer>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
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

function ShortcutCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
      <Link
        href="/config"
        className="mt-4 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
      >
        설정 열기
      </Link>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      <p className="mt-3 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
      {message}
    </div>
  );
}
