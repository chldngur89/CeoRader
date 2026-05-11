"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import type { ControlRoomResponse } from "@/lib/app/control-room";
import { STORAGE_KEYS, normalizeOnboardingData, type OnboardingData } from "@/lib/app/state";

type RegistrySource = {
  id: string;
  type: string;
  label: string;
  url: string;
  priority: number;
  isActive: boolean;
  tags: string[];
};

type RegistryPayload = {
  company: string;
  website: string;
  sources: RegistrySource[];
};

function parseManualSourceText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [labelPart, urlPart] = line.includes("|") ? line.split("|") : [`Custom ${index + 1}`, line];
      return {
        label: labelPart.trim(),
        url: urlPart.trim(),
        type: "custom",
      };
    });
}

export default function CompanyRegistryPage() {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [controlRoom, setControlRoom] = useState<ControlRoomResponse | null>(null);
  const [registries, setRegistries] = useState<Record<string, RegistryPayload>>({});
  const [manualDrafts, setManualDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (!raw) {
      setLoading(false);
      return;
    }

    const parsed = normalizeOnboardingData(JSON.parse(raw));
    setOnboarding(parsed);
    void loadAll(parsed);
  }, []);

  async function loadAll(data: OnboardingData) {
    try {
      setError(null);
      const response = await fetch("/api/agentic/control-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName,
          companyWebsite: data.companyWebsite,
          trackedCompanies: data.trackedCompanies,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "소스 커버리지를 불러오지 못했습니다.");
      }

      const nextControlRoom = payload as ControlRoomResponse;
      setControlRoom(nextControlRoom);

      const registryEntries = await Promise.all(
        nextControlRoom.companies.map(async (company) => {
          const registryResponse = await fetch(`/api/agentic/sources?company=${encodeURIComponent(company.company)}`);
          if (!registryResponse.ok) {
            return null;
          }
          const registryPayload = await registryResponse.json();
          return registryPayload?.registry
            ? [company.company, {
                company: registryPayload.registry.company,
                website: registryPayload.registry.website,
                sources: registryPayload.registry.sources,
              }]
            : null;
        })
      );

      setRegistries(
        Object.fromEntries(registryEntries.filter(Boolean) as Array<[string, RegistryPayload]>)
      );
    } catch (requestError: any) {
      setError(requestError.message || "소스 커버리지를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSource(company: string, sourceId: string) {
    setRegistries((current) => ({
      ...current,
      [company]: {
        ...current[company],
        sources: current[company].sources.map((source) =>
          source.id === sourceId ? { ...source, isActive: !source.isActive } : source
        ),
      },
    }));
  }

  async function saveRegistry(company: string) {
    const registry = registries[company];
    if (!registry) {
      return;
    }

    try {
      setSavingCompany(company);
      setError(null);

      const response = await fetch("/api/agentic/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          website: registry.website,
          includeDefaults: true,
          sourceStates: registry.sources.map((source) => ({
            id: source.id,
            isActive: source.isActive,
            label: source.label,
            url: source.url,
            priority: source.priority,
            tags: source.tags,
          })),
          manualSources: parseManualSourceText(manualDrafts[company] || ""),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "레지스트리를 저장하지 못했습니다.");
      }

      setRegistries((current) => ({
        ...current,
        [company]: {
          company: payload.registry.company,
          website: payload.registry.website,
          sources: payload.registry.sources,
        },
      }));
      setManualDrafts((current) => ({ ...current, [company]: "" }));
      if (onboarding) {
        await loadAll(onboarding);
      }
    } catch (requestError: any) {
      setError(requestError.message || "레지스트리를 저장하지 못했습니다.");
    } finally {
      setSavingCompany(null);
    }
  }

  const orderedCompanies = useMemo(
    () =>
      controlRoom?.companies
        .slice()
        .sort((left, right) => (left.company === onboarding?.companyName ? -1 : right.company === onboarding?.companyName ? 1 : 0)) || [],
    [controlRoom, onboarding]
  );

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">소스 레지스트리</h1>
        <p className="text-sm text-slate-500 mt-1">
          기본 소스를 켜고 끄고, 수동 URL을 추가하고, 마지막 스캔 상태를 함께 봅니다.
        </p>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        {!onboarding ? (
          <EmptyState />
        ) : loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid grid-cols-4 gap-3">
              <Metric label="회사" value={String(controlRoom?.overview.trackedCompanies || 0)} />
              <Metric label="활성 소스" value={String(controlRoom?.overview.activeSources || 0)} />
              <Metric label="스냅샷" value={String(controlRoom?.overview.sourcesWithSnapshots || 0)} />
              <Metric label="변화 회사" value={String(controlRoom?.overview.changedCompanies || 0)} />
            </section>

            {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

            {orderedCompanies.map((company) => {
              const registry = registries[company.company];
              const sourceStatusById = new Map(company.sources.map((source) => [source.id, source]));

              return (
                <section key={company.entityId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{company.company}</h2>
                        {company.company === onboarding.companyName && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            우리 회사
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{company.website}</p>
                    </div>
                    <button
                      onClick={() => saveRegistry(company.company)}
                      disabled={savingCompany === company.company}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    >
                      {savingCompany === company.company ? "저장 중..." : "저장"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <MiniMetric label="변화" value={String(company.stats.changedSources)} />
                    <MiniMetric label="초기" value={String(company.stats.initialSources)} />
                    <MiniMetric label="에러" value={String(company.stats.errorSources)} />
                  </div>

                  <div className="space-y-2">
                    {(registry?.sources || []).map((source) => {
                      const status = sourceStatusById.get(source.id);
                      return (
                        <div key={source.id} className="rounded-xl bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800">
                                  {source.label} <span className="text-slate-400">· {source.type}</span>
                                </p>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                  {status?.lastStatus || "pending"}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-slate-500">{source.url}</p>
                              <p className="mt-1 text-xs text-slate-400">{status?.lastSummary || "아직 수집 전입니다."}</p>
                            </div>
                            <button
                              onClick={() => toggleSource(company.company, source.id)}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                source.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {source.isActive ? "active" : "paused"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">수동 소스 추가</p>
                    <textarea
                      value={manualDrafts[company.company] || ""}
                      onChange={(event) =>
                        setManualDrafts((current) => ({
                          ...current,
                          [company.company]: event.target.value,
                        }))
                      }
                      className="mt-2 h-24 w-full resize-none rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"
                      placeholder={"형식: 라벨 | URL\n예: API Docs | https://example.com/docs"}
                    />
                  </div>
                </section>
              );
            })}

            <section className="grid grid-cols-2 gap-3">
              <Shortcut href="/customers" title="경쟁사 타임라인" description="회사별 이벤트와 추세를 묶어 봅니다." />
              <Shortcut href="/poc" title="런 리뷰" description="개별 실행과 diff 상세를 검토합니다." />
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

function Shortcut({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      <p className="mt-3 text-sm text-slate-500">소스 레지스트리를 불러오는 중입니다.</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">온보딩이 먼저 필요합니다</p>
      <p className="mt-2 text-xs text-slate-500">회사 정보와 추적 대상을 설정해야 소스 레지스트리가 생깁니다.</p>
      <Link href="/onboarding" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">
        온보딩 열기
      </Link>
    </div>
  );
}
