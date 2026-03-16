"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import { formatStructuredHighlights, hasStructuredChanges } from "@/lib/app/structured-change";
import {
  STORAGE_KEYS,
  hasConfiguredTrackedCompanies,
  normalizeOnboardingData,
  type OnboardingData,
} from "@/lib/app/state";
import {
  trackedCompaniesSignature,
  type CachedRadarResponse,
  type RadarResponse,
  type RadarSignal,
} from "@/lib/app/radar-cache";
import { normalizeVaultItems, type VaultItem } from "@/lib/app/vault";

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

const CATEGORY_CONFIG = {
  opportunity: { label: "기회", bg: "bg-green-100", text: "text-green-700" },
  threat: { label: "위협", bg: "bg-red-100", text: "text-red-700" },
  trend: { label: "트렌드", bg: "bg-blue-100", text: "text-blue-700" },
};

export default function SignalsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "opportunity" | "threat" | "trend">("all");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [radar, setRadar] = useState<RadarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const rawData = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (!rawData) {
      setBooting(false);
      return;
    }

    const parsed = normalizeOnboardingData(JSON.parse(rawData));
    setOnboardingData(parsed);

    const vaultRaw = localStorage.getItem(STORAGE_KEYS.vault);
    if (vaultRaw) {
      setSavedIds(normalizeVaultItems(JSON.parse(vaultRaw)).map((item) => item.id));
    }

    const cachedRaw = localStorage.getItem(STORAGE_KEYS.radarCache);
    const signature = trackedCompaniesSignature(parsed.trackedCompanies);

    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as CachedRadarResponse;
        const age = Date.now() - new Date(cached.timestamp).getTime();

        if (cached.trackedCompaniesSignature === signature && age < CACHE_TTL_MS) {
          setRadar(cached);
          setBooting(false);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.radarCache);
      }
    }

    if (hasConfiguredTrackedCompanies(parsed)) {
      void runScan(parsed);
    } else {
      setBooting(false);
    }
  }, []);

  async function runScan(data = onboardingData) {
    if (!data) return;
    if (!hasConfiguredTrackedCompanies(data)) {
      setBooting(false);
      return;
    }

    try {
      setLoading(true);
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
        throw new Error(payload.message || payload.error || "시장 신호 스캔에 실패했습니다.");
      }

      const nextRadar = payload as RadarResponse;
      setRadar(nextRadar);

      const cached: CachedRadarResponse = {
        ...nextRadar,
        trackedCompaniesSignature: trackedCompaniesSignature(data.trackedCompanies),
      };
      localStorage.setItem(STORAGE_KEYS.radarCache, JSON.stringify(cached));
    } catch (scanError: any) {
      setError(scanError.message || "시장 신호 스캔에 실패했습니다.");
    } finally {
      setLoading(false);
      setBooting(false);
    }
  }

  function saveSignal(signal: RadarSignal) {
    const raw = localStorage.getItem(STORAGE_KEYS.vault);
    const items = normalizeVaultItems(raw ? JSON.parse(raw) : []);
    const itemId = `signal-${signal.id}`;

    if (items.some((item) => item.id === itemId)) {
      return;
    }

    const nextItem: VaultItem = {
      id: itemId,
      type: "signal",
      title: signal.title,
      content: `${signal.description} 추천: ${signal.recommendation}`,
      tags: [signal.company, ...signal.changeTypes].slice(0, 5),
      company: signal.company,
      source: signal.source,
      link: signal.link,
      savedAt: new Date().toISOString(),
    };

    const nextItems = [nextItem, ...items];
    localStorage.setItem(STORAGE_KEYS.vault, JSON.stringify(nextItems));
    setSavedIds(nextItems.map((item) => item.id));
  }

  const hasTargets = onboardingData ? hasConfiguredTrackedCompanies(onboardingData) : false;
  const filteredSignals =
    filter === "all"
      ? radar?.signals || []
      : (radar?.signals || []).filter((signal) => signal.category === filter);

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-custom tracking-tight">시장 신호</h1>
            <p className="text-slate-500 text-sm mt-1">
              공식 사이트를 직접 탐색해 변화만 골라 보여줍니다.
            </p>
          </div>
          {hasTargets && (
            <button
              onClick={() => runScan()}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-60"
            >
              {loading ? "스캔 중..." : "새로 스캔"}
            </button>
          )}
        </div>
      </header>

      <div className="px-5 mb-4">
        {!hasTargets ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">공식 사이트가 아직 없습니다</p>
            <p className="text-xs text-slate-500 mt-2">
              설정에서 경쟁사 웹사이트를 넣어야 Playwright 기반 agentic search가 동작합니다.
            </p>
            <button
              onClick={() => router.push("/config")}
              className="mt-4 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold"
            >
              설정 열기
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <Metric label="추적 회사" value={String(radar?.overview.scannedCompanies || 0)} />
              <Metric label="변화" value={String(radar?.overview.changedSignals || 0)} />
              <Metric label="기준선" value={String(radar?.overview.initialSignals || 0)} />
              <Metric label="에러" value={String(radar?.overview.errors || 0)} />
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {radar?.overview.headline || "레이더 준비 중"}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {radar?.overview.summary || "공식 사이트를 등록하면 가격, 제품, 채용, 메시지 변화를 추적합니다."}
              </p>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>

            {radar?.companyResults && radar.companyResults.length > 0 && (
              <div className="space-y-2">
                {radar.companyResults.map((result) => (
                  <div key={result.company} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-700">{result.company}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          result.status === "ok"
                            ? "bg-slate-900 text-white"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {result.status === "ok" ? "Agentic Scan" : "Error"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{result.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {hasTargets && (
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { key: "all", label: "전체" },
              { key: "opportunity", label: "기회" },
              { key: "threat", label: "위협" },
              { key: "trend", label: "트렌드" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as typeof filter)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === item.key ? "bg-navy-custom text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 px-5 pb-24">
        {booting ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredSignals.length === 0 && hasTargets ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            지금은 새로 감지된 변화가 없습니다. 그래도 각 공식 사이트의 최신 스냅샷은 유지되고 있습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSignals.map((signal) => {
              const config = CATEGORY_CONFIG[signal.category];
              const saved = savedIds.includes(`signal-${signal.id}`);

              return (
                <div key={signal.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {signal.company}
                        </span>
                        <span className="text-[10px] text-slate-400">{signal.time}</span>
                      </div>
                      <h3 className="font-bold text-slate-900">{signal.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {signal.source} · {signal.sourceType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-navy-custom">{signal.importance}</p>
                      <p className="text-[10px] text-slate-400">priority</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 mt-3">{signal.description}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {signal.changeTypes.map((changeType) => (
                      <span
                        key={changeType}
                        className="px-2 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
                      >
                        {changeType}
                      </span>
                    ))}
                  </div>

                  {hasStructuredChanges(signal.structured) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formatStructuredHighlights(signal.structured).map((item) => (
                        <span
                          key={`${signal.id}-${item}`}
                          className="px-2 py-1 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {signal.added.length > 0 && (
                    <div className="mt-4 rounded-xl bg-green-50 p-3">
                      <p className="text-[11px] font-bold text-green-700 uppercase tracking-widest">
                        Added
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-green-900">
                        {signal.added.slice(0, 3).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {signal.removed.length > 0 && (
                    <div className="mt-3 rounded-xl bg-rose-50 p-3">
                      <p className="text-[11px] font-bold text-rose-700 uppercase tracking-widest">
                        Removed
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-rose-900">
                        {signal.removed.slice(0, 3).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Recommended next step
                    </p>
                    <p className="text-sm text-slate-700 mt-2">{signal.recommendation}</p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => window.open(signal.link, "_blank", "noopener,noreferrer")}
                      className="flex-1 rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold"
                    >
                      원문 열기
                    </button>
                    <button
                      onClick={() => saveSignal(signal)}
                      disabled={saved}
                      className={`flex-1 rounded-xl py-3 text-sm font-semibold ${
                        saved
                          ? "bg-slate-200 text-slate-500"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {saved ? "금고 저장됨" : "금고 저장"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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
