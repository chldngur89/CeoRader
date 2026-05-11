"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import type { ControlRoomResponse } from "@/lib/app/control-room";
import type { CachedRadarResponse } from "@/lib/app/radar-cache";
import { STORAGE_KEYS, normalizeOnboardingData, type OnboardingData } from "@/lib/app/state";

type HealthSection = {
  label: string;
  score: number;
  description: string;
};

type DiagnosticItem = {
  level: "error" | "warning" | "info";
  title: string;
  description: string;
  href: string;
  cta: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildSectionScores(
  data: OnboardingData,
  controlRoom: ControlRoomResponse | null,
  radar: CachedRadarResponse | null
): HealthSection[] {
  const configuredTargets = data.trackedCompanies.filter(
    (item) => item.name.trim().length > 0 && item.website.trim().length > 0
  );
  const targetCoverage =
    data.trackedCompanies.length > 0 ? configuredTargets.length / data.trackedCompanies.length : 0;
  const sourceCoverage =
    controlRoom && controlRoom.overview.activeSources > 0
      ? controlRoom.overview.sourcesWithSnapshots / controlRoom.overview.activeSources
      : 0;

  const latestRuns = controlRoom?.companies.filter((item) => item.latestRun) || [];
  const freshRuns =
    latestRuns.length > 0
      ? latestRuns.filter((item) => {
          const time = item.latestRun ? new Date(item.latestRun.timestamp).getTime() : 0;
          return Date.now() - time < 1000 * 60 * 60 * 24 * 3;
        }).length / latestRuns.length
      : 0;

  const errorRate =
    controlRoom && controlRoom.overview.trackedCompanies > 0
      ? controlRoom.overview.companiesWithErrors / controlRoom.overview.trackedCompanies
      : 0;
  const extractorConfidence =
    radar && radar.events.length > 0
      ? radar.events.reduce((sum, item) => sum + item.confidence, 0) / radar.events.length
      : controlRoom && controlRoom.overview.activeSources > 0
        ? 55
        : 0;

  return [
    {
      label: "전략 입력",
      score: clamp(
        [data.companyName, data.description, data.goals.length > 0, data.keywords.length > 0]
          .filter(Boolean)
          .length * 25
      ),
      description: "회사 설명, 목표, 키워드가 얼마나 채워졌는지 봅니다.",
    },
    {
      label: "대상 설정",
      score: clamp(targetCoverage * 100),
      description: "추적 대상에 공식 사이트가 충분히 연결되어 있는지 확인합니다.",
    },
    {
      label: "소스 커버리지",
      score: clamp(sourceCoverage * 100),
      description: "활성 소스 중 실제 스냅샷을 가진 비율입니다.",
    },
    {
      label: "스캔 신선도",
      score: clamp(freshRuns * 100 - errorRate * 30),
      description: "최근 3일 안에 정상적으로 돈 스캔 비율을 반영합니다.",
    },
    {
      label: "추출 신뢰도",
      score: clamp(extractorConfidence),
      description: "상관 이벤트 confidence 평균으로 현재 extractor 품질을 봅니다.",
    },
  ];
}

function overallScore(sections: HealthSection[]) {
  if (sections.length === 0) {
    return 0;
  }

  return clamp(sections.reduce((sum, section) => sum + section.score, 0) / sections.length);
}

function gradeLabel(score: number) {
  if (score >= 85) return "Healthy";
  if (score >= 70) return "Usable";
  if (score >= 50) return "Needs Work";
  return "Fragile";
}

function buildDiagnostics(
  data: OnboardingData,
  controlRoom: ControlRoomResponse | null,
  radar: CachedRadarResponse | null
) {
  const diagnostics: DiagnosticItem[] = [];

  if (!data.companyWebsite) {
    diagnostics.push({
      level: "warning",
      title: "자사 사이트가 없습니다",
      description: "우리 회사 공식 사이트가 없어서 자사 메시지 변화와 포지셔닝 변화는 함께 추적하지 못합니다.",
      href: "/config",
      cta: "설정 열기",
    });
  }

  const incompleteTargets = data.trackedCompanies.filter((item) => item.name.trim() && !item.website.trim());
  if (incompleteTargets.length > 0) {
    diagnostics.push({
      level: "error",
      title: "공식 사이트 누락 대상",
      description: `${incompleteTargets.length}개 대상은 공식 사이트 URL이 없어 추적 레지스트리를 만들지 못합니다.`,
      href: "/config",
      cta: "대상 수정",
    });
  }

  const snapshotPoorCompanies =
    controlRoom?.companies.filter((item) => item.stats.sourcesWithSnapshots < Math.max(1, Math.ceil(item.stats.activeSources / 2))) ||
    [];
  if (snapshotPoorCompanies.length > 0) {
    diagnostics.push({
      level: "warning",
      title: "스냅샷 커버리지 부족",
      description: `${snapshotPoorCompanies
        .slice(0, 3)
        .map((item) => item.company)
        .join(", ")} 등 ${snapshotPoorCompanies.length}개 회사는 스냅샷 커버리지가 절반 이하입니다.`,
      href: "/company",
      cta: "소스 점검",
    });
  }

  const errorSources =
    controlRoom?.companies.flatMap((company) =>
      company.sources
        .filter((source) => source.lastStatus === "error")
        .map((source) => `${company.company} · ${source.label}`)
    ) || [];
  if (errorSources.length > 0) {
    diagnostics.push({
      level: "error",
      title: "최근 스캔 에러",
      description: `${errorSources.slice(0, 3).join(", ")} 등 ${errorSources.length}개 소스에서 최근 스캔 에러가 났습니다.`,
      href: "/poc",
      cta: "런 리뷰",
    });
  }

  const staleCompanies =
    controlRoom?.companies.filter((company) => {
      const timestamp = company.latestRun?.timestamp;
      return !timestamp || Date.now() - new Date(timestamp).getTime() > 1000 * 60 * 60 * 24 * 3;
    }) || [];
  if (staleCompanies.length > 0) {
    diagnostics.push({
      level: "warning",
      title: "stale run",
      description: `${staleCompanies
        .slice(0, 3)
        .map((item) => item.company)
        .join(", ")} 등 ${staleCompanies.length}개 회사는 최근 3일 안에 유효한 런이 없습니다.`,
      href: "/poc",
      cta: "런 확인",
    });
  }

  const lowConfidenceCompanies = Object.entries(
    (radar?.events || []).reduce<Record<string, { total: number; count: number }>>((accumulator, event) => {
      const current = accumulator[event.company] || { total: 0, count: 0 };
      accumulator[event.company] = {
        total: current.total + event.confidence,
        count: current.count + 1,
      };
      return accumulator;
    }, {})
  )
    .map(([company, value]) => ({
      company,
      average: value.total / Math.max(1, value.count),
      count: value.count,
    }))
    .filter((item) => item.average < 65);

  if (lowConfidenceCompanies.length > 0) {
    diagnostics.push({
      level: "info",
      title: "extractor confidence 낮음",
      description: `${lowConfidenceCompanies
        .slice(0, 3)
        .map((item) => `${item.company}(${Math.round(item.average)})`)
        .join(", ")} 등 ${lowConfidenceCompanies.length}개 회사는 correlation 근거가 더 필요합니다.`,
      href: "/customers",
      cta: "타임라인 보기",
    });
  }

  return diagnostics;
}

export default function RadarHealthPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [controlRoom, setControlRoom] = useState<ControlRoomResponse | null>(null);
  const [radar, setRadar] = useState<CachedRadarResponse | null>(null);
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
        throw new Error(payload.message || payload.error || "레이더 건강도를 계산하지 못했습니다.");
      }

      setControlRoom(payload as ControlRoomResponse);
    } catch (requestError: any) {
      setError(requestError.message || "레이더 건강도를 계산하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(
    () => (data ? buildSectionScores(data, controlRoom, radar) : []),
    [controlRoom, data, radar]
  );
  const score = overallScore(sections);
  const diagnostics = data ? buildDiagnostics(data, controlRoom, radar) : [];
  const staleCompanies =
    controlRoom?.companies.filter((company) => {
      const timestamp = company.latestRun?.timestamp;
      return !timestamp || Date.now() - new Date(timestamp).getTime() > 1000 * 60 * 60 * 24 * 3;
    }).length || 0;
  const errorSources =
    controlRoom?.companies.reduce(
      (sum, company) => sum + company.sources.filter((source) => source.lastStatus === "error").length,
      0
    ) || 0;
  const snapshotGapCompanies =
    controlRoom?.companies.filter((company) => company.stats.sourcesWithSnapshots < company.stats.activeSources).length || 0;
  const lowConfidenceCompanies = Object.values(
    (radar?.events || []).reduce<Record<string, { total: number; count: number }>>((accumulator, event) => {
      const current = accumulator[event.company] || { total: 0, count: 0 };
      accumulator[event.company] = {
        total: current.total + event.confidence,
        count: current.count + 1,
      };
      return accumulator;
    }, {})
  ).filter((item) => item.count > 0 && item.total / item.count < 65).length;

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">레이더 건강도</h1>
        <p className="text-sm text-slate-500 mt-1">
          설정 완성도, 커버리지, 신선도, extractor 품질을 같이 평가합니다.
        </p>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        {!data ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-800">아직 건강도를 계산할 데이터가 없습니다</p>
            <p className="mt-2 text-xs text-slate-500">온보딩과 추적 대상 설정이 먼저 필요합니다.</p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
            >
              온보딩 열기
            </Link>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
            <p className="mt-3 text-sm text-slate-500">레이더 건강도를 계산하는 중입니다.</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-navy-custom to-blue-700 p-6 text-white text-center">
              <p className="text-sm text-white/70">Radar Health Score</p>
              <p className="mt-2 text-5xl font-bold">{score}</p>
              <p className="mt-2 text-lg">{gradeLabel(score)}</p>
              <p className="mt-3 text-xs text-white/70">
                추적 회사 {controlRoom?.overview.trackedCompanies || 0}개 · 활성 소스{" "}
                {controlRoom?.overview.activeSources || 0}개
              </p>
            </section>

            <section className="grid grid-cols-4 gap-3">
              <MetricCard label="stale" value={String(staleCompanies)} />
              <MetricCard label="error source" value={String(errorSources)} />
              <MetricCard label="snapshot gap" value={String(snapshotGapCompanies)} />
              <MetricCard label="low confidence" value={String(lowConfidenceCompanies)} />
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">세부 진단</h2>
              <div className="mt-4 space-y-4">
                {sections.map((section) => (
                  <div key={section.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">{section.label}</p>
                      <span className="text-xs font-bold text-slate-500">{section.score}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.max(6, section.score)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{section.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Coverage / Diagnostics</h2>
              <div className="mt-4 space-y-2">
                {diagnostics.length > 0 ? (
                  diagnostics.map((item) => (
                    <div
                      key={`${item.title}-${item.href}`}
                      className={`rounded-xl px-3 py-3 text-sm ${
                        item.level === "error"
                          ? "bg-rose-50 text-rose-700"
                          : item.level === "warning"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-5">{item.description}</p>
                      <Link
                        href={item.href}
                        className="mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-slate-700"
                      >
                        {item.cta}
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                    심각한 설정 결손은 없습니다. 다음은 extractor 정교화와 correlation 튜닝 단계입니다.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">권장 조치</h2>
              <div className="mt-4 space-y-2">
                {(diagnostics.length > 0
                  ? diagnostics.slice(0, 4).map((item) => `${item.title}: ${item.description}`)
                  : ["현재 기본 운용은 가능하며, 다음 우선순위는 ranking / dedupe와 extractor 튜닝입니다."]).map(
                  (item) => (
                    <div key={item} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  )
                )}
              </div>
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
