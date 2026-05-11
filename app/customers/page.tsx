"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import type { ControlRoomCompanyStatus, ControlRoomResponse } from "@/lib/app/control-room";
import type { CorrelatedEvent } from "@/lib/app/intelligence";
import {
  formatRelativeTime,
  type CachedRadarResponse,
  type RadarSignal,
} from "@/lib/app/radar-cache";
import { STORAGE_KEYS, normalizeOnboardingData, type OnboardingData } from "@/lib/app/state";

const STATUS_CONFIG = {
  ok: "bg-slate-900 text-white",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
} as const;

type CompanyTimelineItem = {
  id: string;
  kind: "event" | "signal";
  title: string;
  summary: string;
  importance: number;
  occurredAt: string;
  changeTypes: string[];
  evidenceCount?: number;
  confidence?: number;
};

function formatChangeType(changeType: string) {
  const labels: Record<string, string> = {
    pricing: "가격",
    messaging: "메시지",
    hiring: "채용",
    partnership: "제휴",
    product: "제품",
    initial: "기준선",
  };

  return labels[changeType] || changeType;
}

function buildTimeline(
  company: ControlRoomCompanyStatus,
  events: CorrelatedEvent[],
  signals: RadarSignal[]
) {
  const signalOccurredAt = company.latestRun?.timestamp || new Date().toISOString();
  const items: CompanyTimelineItem[] = [
    ...events.map((event) => ({
      id: event.id,
      kind: "event" as const,
      title: event.title,
      summary: event.summary,
      importance: event.importance,
      occurredAt: event.occurredAt,
      changeTypes: event.changeTypes,
      evidenceCount: event.evidenceCount,
      confidence: event.confidence,
    })),
    ...signals.map((signal) => ({
      id: signal.id,
      kind: "signal" as const,
      title: signal.title,
      summary: signal.recommendation,
      importance: signal.importance,
      occurredAt: signalOccurredAt,
      changeTypes: signal.changeTypes,
    })),
  ];

  return items
    .sort((left, right) => {
      const timeDiff = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return right.importance - left.importance;
    })
    .slice(0, 4);
}

export default function WatchlistPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [controlRoom, setControlRoom] = useState<ControlRoomResponse | null>(null);
  const [radarSignals, setRadarSignals] = useState<RadarSignal[]>([]);
  const [radarEvents, setRadarEvents] = useState<CorrelatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (!raw) {
      setLoading(false);
      return;
    }

    const cachedRadar = localStorage.getItem(STORAGE_KEYS.radarCache);
    if (cachedRadar) {
      try {
        const parsedRadar = JSON.parse(cachedRadar) as CachedRadarResponse;
        setRadarSignals(parsedRadar.signals || []);
        setRadarEvents(parsedRadar.events || []);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.radarCache);
      }
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
        throw new Error(payload.message || payload.error || "워치리스트를 불러오지 못했습니다.");
      }

      setControlRoom(payload as ControlRoomResponse);
    } catch (requestError: any) {
      setError(requestError.message || "워치리스트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const signalsByCompany = useMemo(() => {
    return radarSignals.reduce<Record<string, RadarSignal[]>>((accumulator, signal) => {
      accumulator[signal.company] = [...(accumulator[signal.company] || []), signal].sort(
        (left, right) => right.importance - left.importance
      );
      return accumulator;
    }, {});
  }, [radarSignals]);

  const eventsByCompany = useMemo(() => {
    return radarEvents.reduce<Record<string, CorrelatedEvent[]>>((accumulator, event) => {
      accumulator[event.company] = [...(accumulator[event.company] || []), event].sort(
        (left, right) => right.importance - left.importance
      );
      return accumulator;
    }, {});
  }, [radarEvents]);

  const companyCards = useMemo(() => {
    if (!controlRoom) {
      return [];
    }

    return controlRoom.companies
      .filter((company) => company.company !== data?.companyName)
      .map((company) => {
        const companySignals = signalsByCompany[company.company] || [];
        const companyEvents = eventsByCompany[company.company] || [];
        const timeline = buildTimeline(company, companyEvents, companySignals);
        const trendCounts = [...companyEvents.flatMap((event) => event.changeTypes), ...companySignals.flatMap((signal) => signal.changeTypes)]
          .reduce<Record<string, number>>((accumulator, changeType) => {
            accumulator[changeType] = (accumulator[changeType] || 0) + 1;
            return accumulator;
          }, {});
        const trends = Object.entries(trendCounts)
          .sort((left, right) => right[1] - left[1])
          .slice(0, 3);

        return {
          company,
          companySignals,
          companyEvents,
          timeline,
          trends,
        };
      })
      .sort((left, right) => {
        const leftScore = (left.timeline[0]?.importance || 0) + left.companyEvents.length * 2 + left.companySignals.length;
        const rightScore = (right.timeline[0]?.importance || 0) + right.companyEvents.length * 2 + right.companySignals.length;
        return rightScore - leftScore;
      });
  }, [controlRoom, data, eventsByCompany, signalsByCompany]);

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">워치리스트</h1>
        <p className="text-sm text-slate-500 mt-1">
          경쟁사별로 연결 이벤트, 신호 추세, 최근 변화 흐름을 한 화면에서 봅니다.
        </p>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        {!data ? (
          <Panel
            title="추적 대상이 아직 없습니다"
            description="설정에서 공식 사이트가 있는 회사를 추가하면 워치리스트가 생성됩니다."
            href="/config"
            cta="설정 열기"
          />
        ) : (
          <>
            <section className="grid grid-cols-3 gap-3">
              <StatCard label="대상 회사" value={String(controlRoom?.overview.trackedCompanies || 0)} />
              <StatCard label="이벤트" value={String(radarEvents.length)} />
              <StatCard label="총 신호" value={String(radarSignals.length)} />
            </section>

            {loading ? (
              <LoadingBlock />
            ) : error ? (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : (
              <section className="space-y-3">
                {companyCards.map(({ company, companySignals, companyEvents, timeline, trends }) => {
                  const latestRun = company.latestRun;
                  const statusKey =
                    company.stats.errorSources > 0
                      ? "error"
                      : company.stats.changedSources > 0
                        ? "warning"
                        : "ok";

                  return (
                    <div key={company.entityId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">{company.company}</h2>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CONFIG[statusKey]}`}>
                              {statusKey === "ok" ? "Stable" : statusKey === "warning" ? "Watch" : "Error"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{company.website}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900">{companyEvents.length}</p>
                          <p className="text-[10px] text-slate-400">events</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <TinyMetric label="변화" value={String(company.stats.changedSources)} />
                        <TinyMetric label="초기" value={String(company.stats.initialSources)} />
                        <TinyMetric label="에러" value={String(company.stats.errorSources)} />
                        <TinyMetric label="신호" value={String(companySignals.length)} />
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          Latest Run
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {latestRun
                            ? `${latestRun.summary.visited}개 소스 방문 · 변화 ${latestRun.summary.changed}건 · 에러 ${latestRun.summary.errors}건`
                            : "아직 실행 이력이 없습니다."}
                        </p>
                        {latestRun && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            {formatRelativeTime(latestRun.timestamp)} 실행
                          </p>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            Event Timeline
                          </p>
                          {trends.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-1">
                              {trends.map(([changeType, count]) => (
                                <span
                                  key={`${company.company}-${changeType}`}
                                  className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                                >
                                  {formatChangeType(changeType)} {count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {timeline.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {timeline.map((item) => (
                              <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                                  <span className="text-xs font-bold text-slate-500">{item.importance}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                    {item.kind === "event" ? "event" : "signal"}
                                  </span>
                                  {item.changeTypes.slice(0, 2).map((changeType) => (
                                    <span
                                      key={`${item.id}-${changeType}`}
                                      className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500"
                                    >
                                      {formatChangeType(changeType)}
                                    </span>
                                  ))}
                                </div>
                                <p className="mt-2 text-xs text-slate-500">{item.summary}</p>
                                <p className="mt-2 text-[11px] text-slate-400">
                                  {formatRelativeTime(item.occurredAt)}
                                  {typeof item.evidenceCount === "number"
                                    ? ` · evidence ${item.evidenceCount}`
                                    : ""}
                                  {typeof item.confidence === "number"
                                    ? ` · confidence ${item.confidence}`
                                    : ""}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            아직 새로 감지된 변화가 없습니다. 다음 스캔에서 이벤트가 생기면 여기에 쌓입니다.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            <section className="grid grid-cols-2 gap-3">
              <PanelCard
                href="/signals"
                title="시장 신호"
                description="연결 이벤트 원문과 added/removed diff를 바로 확인합니다."
              />
              <PanelCard
                href="/poc"
                title="런 리뷰"
                description="개별 실행과 source별 before/after를 검토합니다."
              />
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </MobileContainer>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function TinyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-sm font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
      >
        {cta}
      </Link>
    </div>
  );
}

function PanelCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function LoadingBlock() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      <p className="mt-3 text-sm text-slate-500">워치리스트를 불러오는 중입니다.</p>
    </div>
  );
}
