"use client";

import { useMemo, useState } from "react";

type RegistryResponse = {
  success?: boolean;
  registry?: {
    company: string;
    website: string;
    updatedAt: string;
    sources: Array<{
      id: string;
      type: string;
      label: string;
      url: string;
      candidateUrls: string[];
      priority: number;
      isActive: boolean;
    }>;
  };
  error?: string;
  message?: string;
};

type ScanResponse = {
  runId?: string;
  engine?: string;
  company?: string;
  summary?: {
    visited: number;
    changed: number;
    unchanged: number;
    initial: number;
    errors: number;
    changeTypes: string[];
  };
  changedSources?: Array<{
    sourceId: string;
    label: string;
    type: string;
    summary: string;
    changeTypes: string[];
  }>;
  results?: Array<{
    source: {
      id: string;
      type: string;
      label: string;
      url: string;
    };
    fetch: {
      status: "success" | "error";
      fetchedAt: string;
      finalUrl?: string;
      title?: string;
      excerpt?: string;
      attemptedUrls: string[];
      error?: string;
    };
    diff?: {
      status: "initial" | "unchanged" | "changed";
      summary: string;
      similarity: number;
      changeTypes: string[];
      added: string[];
      removed: string[];
    };
  }>;
  error?: string;
  message?: string;
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

export default function AgenticScanTestPage() {
  const [company, setCompany] = useState("Vercel");
  const [website, setWebsite] = useState("https://vercel.com");
  const [manualSourceText, setManualSourceText] = useState("");
  const [includeDefaults, setIncludeDefaults] = useState(true);
  const [sourceLimit, setSourceLimit] = useState(6);
  const [registryResult, setRegistryResult] = useState<RegistryResponse | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState<"registry" | "scan" | null>(null);

  const manualSources = useMemo(() => parseManualSourceText(manualSourceText), [manualSourceText]);

  async function buildRegistry() {
    setLoading("registry");
    try {
      const response = await fetch("/api/agentic/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          website,
          includeDefaults,
          manualSources,
        }),
      });
      const data = await response.json();
      setRegistryResult(data);
    } catch (error: any) {
      setRegistryResult({ error: error.message });
    } finally {
      setLoading(null);
    }
  }

  async function runScan() {
    setLoading("scan");
    try {
      const response = await fetch("/api/agentic/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          website,
          includeDefaults,
          manualSources,
          sourceLimit,
        }),
      });
      const data = await response.json();
      setScanResult(data);
    } catch (error: any) {
      setScanResult({ error: error.message });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-slate-900">Agentic Search Test</h1>
          <p className="text-sm text-slate-500 mt-2">
            추적 소스 레지스트리 생성, Playwright 스캔, 스냅샷 변화 감지를 한 번에 검증합니다.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">회사명</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">대표 사이트</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              수동 추적 소스
            </label>
            <textarea
              value={manualSourceText}
              onChange={(e) => setManualSourceText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm h-28 resize-none"
              placeholder={"형식: 라벨 | URL\n예: Pricing | https://vercel.com/pricing"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={includeDefaults}
                onChange={(e) => setIncludeDefaults(e.target.checked)}
              />
              기본 소스 자동 생성
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              최대 스캔 수
              <input
                type="number"
                min={1}
                max={12}
                value={sourceLimit}
                onChange={(e) => setSourceLimit(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={buildRegistry}
              disabled={loading !== null}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading === "registry" ? "생성 중..." : "소스 레지스트리 만들기"}
            </button>
            <button
              onClick={runScan}
              disabled={loading !== null}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading === "scan" ? "스캔 중..." : "Playwright 스캔 실행"}
            </button>
          </div>
        </div>

        {registryResult && (
          <section className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Tracked Source Registry</h2>
              {registryResult.registry?.updatedAt && (
                <span className="text-xs text-slate-400">
                  {new Date(registryResult.registry.updatedAt).toLocaleString("ko-KR")}
                </span>
              )}
            </div>

            {registryResult.error ? (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {registryResult.message || registryResult.error}
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {registryResult.registry?.sources.map((source) => (
                  <div key={source.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{source.label}</p>
                        <p className="text-xs text-slate-500">{source.type}</p>
                      </div>
                      <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
                        P{source.priority}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-600 break-all">{source.url}</p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      후보 URL {source.candidateUrls.length}개
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {scanResult && (
          <section className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-slate-900">Scan Result</h2>

            {scanResult.error ? (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {scanResult.message || scanResult.error}
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <MetricCard label="성공 수집" value={String(scanResult.summary?.visited || 0)} />
                  <MetricCard label="초기 저장" value={String(scanResult.summary?.initial || 0)} />
                  <MetricCard label="변화 감지" value={String(scanResult.summary?.changed || 0)} />
                  <MetricCard label="변화 없음" value={String(scanResult.summary?.unchanged || 0)} />
                  <MetricCard label="에러" value={String(scanResult.summary?.errors || 0)} />
                </div>

                {scanResult.changedSources && scanResult.changedSources.length > 0 && (
                  <div className="mt-6 rounded-2xl bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">변화 감지된 소스</p>
                    <div className="mt-3 space-y-3">
                      {scanResult.changedSources.map((source) => (
                        <div key={source.sourceId} className="rounded-xl bg-white px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{source.label}</p>
                          <p className="text-xs text-slate-500 mt-1">{source.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {scanResult.results?.map((result) => (
                    <div key={result.source.id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{result.source.label}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {result.source.type}
                        </span>
                        {result.diff?.status && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              result.diff.status === "changed"
                                ? "bg-amber-100 text-amber-700"
                                : result.diff.status === "initial"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {result.diff.status}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-500 break-all">{result.source.url}</p>

                      {result.fetch.status === "error" ? (
                        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                          {result.fetch.error}
                        </p>
                      ) : (
                        <>
                          <p className="mt-3 text-sm font-medium text-slate-800">
                            {result.fetch.title || "(제목 없음)"}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">{result.fetch.excerpt}</p>
                          <p className="mt-2 text-[11px] text-slate-400 break-all">
                            최종 URL: {result.fetch.finalUrl}
                          </p>
                        </>
                      )}

                      {result.diff && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-500">요약</p>
                            <p className="mt-2 text-sm text-slate-700">{result.diff.summary}</p>
                            <p className="mt-2 text-[11px] text-slate-400">
                              similarity {result.diff.similarity}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-500">Change Types</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(result.diff.changeTypes.length > 0
                                ? result.diff.changeTypes
                                : ["none"]
                              ).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {result.diff?.added && result.diff.added.length > 0 && (
                        <div className="mt-4 rounded-xl bg-green-50 p-3">
                          <p className="text-xs font-semibold text-green-700">Added</p>
                          <ul className="mt-2 space-y-2 text-sm text-green-900">
                            {result.diff.added.slice(0, 3).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.diff?.removed && result.diff.removed.length > 0 && (
                        <div className="mt-4 rounded-xl bg-rose-50 p-3">
                          <p className="text-xs font-semibold text-rose-700">Removed</p>
                          <ul className="mt-2 space-y-2 text-sm text-rose-900">
                            {result.diff.removed.slice(0, 3).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
