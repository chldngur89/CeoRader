"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import type { ControlRoomCompanyStatus, ControlRoomResponse } from "@/lib/app/control-room";
import { STORAGE_KEYS, normalizeOnboardingData, type OnboardingData } from "@/lib/app/state";

type HealthSection = {
  label: string;
  score: number;
  description: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildSectionScores(data: OnboardingData, controlRoom: ControlRoomResponse | null): HealthSection[] {
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

function buildIssues(data: OnboardingData, controlRoom: ControlRoomResponse | null) {
  const issues: string[] = [];

  if (!data.companyWebsite) {
    issues.push("우리 회사 공식 사이트가 없어서 자사 메시지 변화도 함께 추적하지 못합니다.");
  }

  const incompleteTargets = data.trackedCompanies.filter((item) => !item.website.trim());
  if (incompleteTargets.length > 0) {
    issues.push(`${incompleteTargets.length}개 대상은 공식 사이트 URL이 없어 추적 소스를 만들지 못합니다.`);
  }

  const errorCompanies = controlRoom?.companies.filter((item) => item.stats.errorSources > 0) || [];
  if (errorCompanies.length > 0) {
    issues.push(`${errorCompanies.length}개 회사에서 최근 스캔 에러가 발생했습니다. URL 또는 렌더링 경로를 점검해야 합니다.`);
  }

  const snapshotPoorCompanies =
    controlRoom?.companies.filter((item) => item.stats.sourcesWithSnapshots < Math.max(1, Math.ceil(item.stats.activeSources / 2))) ||
    [];
  if (snapshotPoorCompanies.length > 0) {
    issues.push(`${snapshotPoorCompanies.length}개 회사는 스냅샷 커버리지가 절반 이하입니다.`);
  }

  return issues;
}

function buildRecommendations(companies: ControlRoomCompanyStatus[]) {
  const recommendations: string[] = [];

  for (const company of companies) {
    if (company.stats.errorSources > 0) {
      recommendations.push(`${company.company}: 에러가 난 소스 URL부터 정리하세요.`);
    }
    if (company.stats.sourcesWithSnapshots === 0) {
      recommendations.push(`${company.company}: 첫 스캔을 돌려 기준선을 확보하세요.`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("현재 설정은 기본 운용이 가능합니다. 다음은 extractor 정교화와 알림 자동화 단계입니다.");
  }

  return recommendations.slice(0, 4);
}

export default function RadarHealthPage() {
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
    () => (data ? buildSectionScores(data, controlRoom) : []),
    [controlRoom, data]
  );
  const score = overallScore(sections);
  const issues = data ? buildIssues(data, controlRoom) : [];
  const recommendations = buildRecommendations(controlRoom?.companies || []);

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">레이더 건강도</h1>
        <p className="text-sm text-slate-500 mt-1">
          설정 완성도, 커버리지, 신선도, 에러율을 같이 평가합니다.
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
              <h2 className="text-sm font-bold text-slate-900">지금 부족한 점</h2>
              <div className="mt-4 space-y-2">
                {issues.length > 0 ? (
                  issues.map((issue) => (
                    <div key={issue} className="rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700">
                      {issue}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                    심각한 설정 결손은 없습니다. 이제 extractor와 알림 자동화로 넘어갈 수 있습니다.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">권장 조치</h2>
              <div className="mt-4 space-y-2">
                {recommendations.map((item) => (
                  <div key={item} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </MobileContainer>
  );
}
