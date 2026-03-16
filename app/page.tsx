"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ActionStepCard from "@/components/dashboard/ActionStepCard";
import InsightSection from "@/components/dashboard/InsightSection";
import TopicCard from "@/components/dashboard/TopicCard";
import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import {
  STORAGE_KEYS,
  hasConfiguredTrackedCompanies,
  normalizeOnboardingData,
  type OnboardingData,
} from "@/lib/app/state";
import {
  formatRelativeTime,
  trackedCompaniesSignature,
  type CachedRadarResponse,
  type RadarResponse,
} from "@/lib/app/radar-cache";

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [radar, setRadar] = useState<RadarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem(STORAGE_KEYS.login);
    const onboarded = localStorage.getItem(STORAGE_KEYS.onboarded);
    const rawData = localStorage.getItem(STORAGE_KEYS.onboarding);
    const userData = localStorage.getItem(STORAGE_KEYS.user);

    if (!loggedIn) {
      router.push("/login");
      return;
    }

    if (!onboarded || !rawData) {
      router.push("/onboarding");
      return;
    }

    const parsed = normalizeOnboardingData(JSON.parse(rawData));
    setOnboardingData(parsed);
    if (userData) setUser(JSON.parse(userData));

    const cachedRaw = localStorage.getItem(STORAGE_KEYS.radarCache);
    const signature = trackedCompaniesSignature(parsed.trackedCompanies);

    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as CachedRadarResponse;
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();

        if (cached.trackedCompaniesSignature === signature && cacheAge < CACHE_TTL_MS) {
          setRadar(cached);
          setLoading(false);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.radarCache);
      }
    }

    if (hasConfiguredTrackedCompanies(parsed)) {
      void runScan(parsed);
      return;
    }

    setLoading(false);
  }, [router]);

  async function runScan(data = onboardingData) {
    if (!data) return;
    if (!hasConfiguredTrackedCompanies(data)) {
      setLoading(false);
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
        throw new Error(payload.message || payload.error || "레이더 스캔에 실패했습니다.");
      }

      const nextRadar = payload as RadarResponse;
      setRadar(nextRadar);

      const cached: CachedRadarResponse = {
        ...nextRadar,
        trackedCompaniesSignature: trackedCompaniesSignature(data.trackedCompanies),
      };
      localStorage.setItem(STORAGE_KEYS.radarCache, JSON.stringify(cached));
    } catch (scanError: any) {
      setError(scanError.message || "레이더 스캔에 실패했습니다.");
    } finally {
      setScanning(false);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
      </MobileContainer>
    );
  }

  if (!onboardingData) {
    return null;
  }

  const hasTrackedTargets = hasConfiguredTrackedCompanies(onboardingData);
  const topics = (radar?.signals || []).slice(0, 10).map((signal, index) => ({
    id: signal.id,
    name: signal.title,
    score: signal.importance,
    type:
      signal.category === "opportunity"
        ? ("Opportunity" as const)
        : signal.category === "threat"
          ? ("Threat" as const)
          : ("Trend" as const),
    rank: index + 1,
    trend:
      signal.category === "opportunity"
        ? ("up" as const)
        : signal.category === "threat"
          ? ("down" as const)
          : ("flat" as const),
    source: `${signal.company} · ${signal.source}`,
    time: signal.time,
  }));

  const topSignals = (radar?.signals || []).slice(0, 3);
  const insight = {
    title: radar?.overview.headline || "레이더가 아직 준비되지 않았습니다",
    relevance:
      radar && radar.signals.length > 0
        ? Math.round(
            radar.signals.slice(0, 5).reduce((sum, item) => sum + item.importance, 0) /
              Math.min(5, radar.signals.length)
          )
        : 68,
    summary:
      radar?.overview.summary ||
      "공식 사이트가 등록되면 가격, 제품, 채용, 메시지 변화를 자동으로 추적합니다.",
    relatedIntelligence:
      radar?.companyResults.slice(0, 3).map((result) => ({
        title: result.summary,
        source: result.company,
        time: radar?.timestamp ? formatRelativeTime(radar.timestamp) : "최근",
        type: (result.signals.length > 0 ? "primary" : "secondary") as "primary" | "secondary",
      })) || [],
    strategicActions:
      radar?.overview.actions.map((action, index) => ({
        id: `action-${index}`,
        title: `우선순위 ${index + 1}`,
        description: action,
      })) || [],
  };

  const actions =
    radar?.overview.actions.map((action, index) => ({
      id: `step-${index}`,
      title: `실행안 ${index + 1}`,
      problem: topSignals[index]?.description || radar.overview.summary,
      proposal: action,
      impact: topSignals[index] ? `${topSignals[index].importance}점 우선순위` : "즉시 검토",
      tags: topSignals[index]?.changeTypes || onboardingData.keywords.slice(0, 2),
      icon:
        index === 0 ? "priority_high" : index === 1 ? "policy" : "analytics",
      impactColor: "text-blue-600",
    })) || [];

  return (
    <MobileContainer>
      <header className="px-5 py-4 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h1 className="text-xl font-bold text-navy-custom tracking-tight">CeoRader</h1>
            <p className="text-[11px] text-slate-400 mt-1">
              {user?.name || onboardingData.companyName || "대표님"}님의 agentic market radar
            </p>
          </div>
          {hasTrackedTargets && (
            <button
              onClick={() => runScan()}
              disabled={scanning}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-60"
            >
              {scanning ? "스캔 중..." : "지금 다시 스캔"}
            </button>
          )}
        </div>

        {hasTrackedTargets ? (
          <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap gap-2">
              {onboardingData.trackedCompanies
                .filter((item) => item.name.trim().length > 0 && item.website.trim().length > 0)
                .map((company) => (
                  <span
                    key={company.id}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold"
                  >
                    {company.name}
                  </span>
                ))}
            </div>
            <p className="text-sm text-slate-700">
              {radar?.overview.summary || "추적 대상을 스캔해 최신 변화를 불러옵니다."}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="변화" value={String(radar?.overview.changedSignals || 0)} />
              <Metric label="기준선" value={String(radar?.overview.initialSignals || 0)} />
              <Metric label="에러" value={String(radar?.overview.errors || 0)} />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">공식 사이트 설정이 필요합니다</p>
            <p className="text-xs text-slate-500 mt-2">
              경쟁사 웹사이트를 등록해야 agentic search가 가격, 제품, 채용 페이지를 직접 추적할 수 있습니다.
            </p>
            <button
              onClick={() => router.push("/config")}
              className="mt-4 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold"
            >
              설정으로 이동
            </button>
          </div>
        )}
      </header>

      {topics.length > 0 && (
        <section className="mt-2">
          <div className="px-5 flex justify-between items-center mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Live Signals
            </h2>
            {radar?.timestamp && (
              <span className="text-[10px] text-slate-400">{formatRelativeTime(radar.timestamp)}</span>
            )}
          </div>
          <div className="flex overflow-x-auto px-5 gap-3 no-scrollbar pb-2">
            {topics.map((topic, index) => (
              <TopicCard key={topic.id} topic={topic} isActive={index === 0} />
            ))}
          </div>
        </section>
      )}

      <main className="px-5 mt-6">
        <InsightSection data={insight} />
      </main>

      {actions.length > 0 && (
        <section className="mt-8 mb-24">
          <div className="px-5 mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              다음 실행
            </h2>
          </div>
          <div className="flex overflow-x-auto px-5 gap-4 no-scrollbar">
            {actions.map((step) => (
              <ActionStepCard key={step.id} step={step} />
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-2 mb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Control Room
          </h2>
          <Link href="/evaluation" className="text-xs font-semibold text-primary">
            상태 점검
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ControlRoomCard href="/brief" title="토픽 브리프" description="AI 같은 주제를 CEO 관점으로 요약" />
          <ControlRoomCard href="/company" title="리서치 브리프" description="추적 범위와 소스 커버리지" />
          <ControlRoomCard href="/customers" title="워치리스트" description="회사별 최신 신호와 강도" />
          <ControlRoomCard href="/poc" title="스캔 로그" description="런 이력과 diff 기록" />
          <ControlRoomCard href="/finance" title="우선순위 보드" description="실행 우선순위와 집중도" />
        </div>
      </section>

      {!scanning && hasTrackedTargets && radar && radar.signals.length === 0 && (
        <div className="px-5 pb-24">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            현재 기준으로 새 변화는 감지되지 않았습니다. 그래도 스냅샷과 기준선은 유지되고 있습니다.
          </div>
        </div>
      )}

      <BottomNav />
    </MobileContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function ControlRoomCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}
