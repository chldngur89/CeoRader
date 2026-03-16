"use client";

import { useEffect, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import { formatStructuredHighlights, hasStructuredChanges } from "@/lib/app/structured-change";
import {
  diffTopicBriefs,
  normalizeTopicBriefAnalysis,
  normalizeTopicBriefHistory,
  type TopicBriefAnalysis,
  type TopicBriefDiff,
} from "@/lib/app/topic-brief";
import { STORAGE_KEYS, joinValues, normalizeOnboardingData, splitValues, type OnboardingData } from "@/lib/app/state";
import { normalizeVaultItems, type VaultItem } from "@/lib/app/vault";

type AnalyzeResponse = {
  success: boolean;
  topic: string;
  analysis: TopicBriefAnalysis;
  sources: Array<{
    title: string;
    link: string;
    source: string;
    pubDate: string;
  }>;
  useRealData: boolean;
  timestamp: string;
};

const LENS_STYLE = {
  adoption: "bg-emerald-100 text-emerald-700",
  competition: "bg-rose-100 text-rose-700",
  infrastructure: "bg-amber-100 text-amber-700",
  regulation: "bg-blue-100 text-blue-700",
  talent: "bg-violet-100 text-violet-700",
} as const;

const PRIORITY_STYLE = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
} as const;

export default function BriefPage() {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [topic, setTopic] = useState("AI");
  const [keywordText, setKeywordText] = useState("enterprise AI, AI agents, GPU, regulation");
  const [description, setDescription] = useState("B2B AI SaaS CEO");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [diff, setDiff] = useState<TopicBriefDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (raw) {
      const parsed = normalizeOnboardingData(JSON.parse(raw));
      setOnboarding(parsed);

      if (parsed.description) {
        setDescription(parsed.description);
      }
      if (parsed.keywords.length > 0) {
        setKeywordText(joinValues(parsed.keywords));
      }
    }

    const cached = localStorage.getItem(STORAGE_KEYS.analysis);
    const cachedTopic = localStorage.getItem(STORAGE_KEYS.analysisTopic);
    const cachedSources = localStorage.getItem(STORAGE_KEYS.analysisSources);
    if (cached && cachedTopic) {
      try {
        setTopic(cachedTopic);
        setResult({
          success: true,
          topic: cachedTopic,
          analysis: normalizeTopicBriefAnalysis(JSON.parse(cached)),
          sources: cachedSources ? JSON.parse(cachedSources) : [],
          useRealData: true,
          timestamp: normalizeTopicBriefAnalysis(JSON.parse(cached)).generatedAt,
        });
      } catch {
        localStorage.removeItem(STORAGE_KEYS.analysis);
        localStorage.removeItem(STORAGE_KEYS.analysisTopic);
        localStorage.removeItem(STORAGE_KEYS.analysisSources);
      }
    }
  }, []);

  async function runBrief() {
    try {
      setLoading(true);
      setSaved(false);
      setError(null);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          description,
          keywords: splitValues(keywordText),
          companyName: onboarding?.companyName || "",
          companyWebsite: onboarding?.companyWebsite || "",
          trackedCompanies: onboarding?.trackedCompanies || [],
          sourceLimit: 3,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "브리프 생성에 실패했습니다.");
      }

      const next = {
        ...(payload as AnalyzeResponse),
        analysis: normalizeTopicBriefAnalysis((payload as AnalyzeResponse).analysis),
      };
      const rawHistory = localStorage.getItem(STORAGE_KEYS.analysisHistory);
      const history = normalizeTopicBriefHistory(rawHistory ? JSON.parse(rawHistory) : []);
      const previous =
        history.find((entry) => entry.topic.toLowerCase() === next.topic.toLowerCase())?.analysis || null;

      setResult(next);
      setDiff(diffTopicBriefs(previous, next.analysis));
      localStorage.setItem(STORAGE_KEYS.analysis, JSON.stringify(next.analysis));
      localStorage.setItem(STORAGE_KEYS.analysisTopic, next.topic);
      localStorage.setItem(STORAGE_KEYS.analysisSources, JSON.stringify(next.sources));
      localStorage.setItem(STORAGE_KEYS.analysisTime, next.timestamp);
      localStorage.setItem(
        STORAGE_KEYS.analysisHistory,
        JSON.stringify(
          [
            {
              topic: next.topic,
              savedAt: next.timestamp,
              analysis: next.analysis,
            },
            ...history.filter((entry) => entry.topic.toLowerCase() !== next.topic.toLowerCase()),
          ].slice(0, 10)
        )
      );
    } catch (requestError: any) {
      setError(requestError.message || "브리프 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function saveBrief() {
    if (!result) return;

    const raw = localStorage.getItem(STORAGE_KEYS.vault);
    const items = normalizeVaultItems(raw ? JSON.parse(raw) : []);
    const id = `brief-${result.topic.toLowerCase()}`;
    if (items.some((item) => item.id === id)) {
      setSaved(true);
      return;
    }

    const item: VaultItem = {
      id,
      type: "brief",
      title: `${result.topic} CEO 브리프`,
      content: `${result.analysis.summary}\n\n핵심 실행안:\n${result.analysis.actions
        .map((action, index) => `${index + 1}. ${action.title}`)
        .join("\n")}`,
      tags: [result.topic, ...result.analysis.insights.map((insight) => insight.lens)].slice(0, 6),
      source: "Topic Brief",
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.vault, JSON.stringify([item, ...items]));
    setSaved(true);
  }

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">토픽 브리프</h1>
        <p className="text-sm text-slate-500 mt-1">
          유료 API 없이 뉴스 검색과 공식 사이트 변화를 함께 읽습니다.
        </p>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">주제</label>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full rounded-xl bg-slate-50 p-3 text-sm"
              placeholder="예: AI"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">CEO 맥락</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-24 w-full resize-none rounded-xl bg-slate-50 p-3 text-sm"
              placeholder="예: B2B AI SaaS CEO"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">핵심 키워드</label>
            <input
              value={keywordText}
              onChange={(event) => setKeywordText(event.target.value)}
              className="w-full rounded-xl bg-slate-50 p-3 text-sm"
              placeholder="enterprise AI, GPU, regulation"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={runBrief}
              disabled={loading}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "브리프 생성 중..." : "브리프 생성"}
            </button>
            <button
              onClick={saveBrief}
              disabled={!result}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              {saved ? "저장됨" : "금고 저장"}
            </button>
          </div>
          {onboarding?.companyName && (
            <p className="text-[11px] text-slate-400">
              현재 회사 맥락: {onboarding.companyName}
            </p>
          )}
          {onboarding && onboarding.trackedCompanies.filter((item) => item.website.trim().length > 0).length > 0 && (
            <p className="text-[11px] text-slate-400">
              공식 사이트 추적 대상: {onboarding.trackedCompanies.filter((item) => item.website.trim().length > 0).length}개
            </p>
          )}
          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        </section>

        {result && (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">CEO Brief</p>
              <h2 className="mt-2 text-2xl font-bold">{result.topic}</h2>
              <p className="mt-3 text-sm text-white/80">{result.analysis.summary}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <BriefMetric label="문서 수" value={String(result.analysis.metrics.totalDocuments)} />
                <BriefMetric label="선별 근거" value={String(result.analysis.metrics.curatedDocuments)} />
                <BriefMetric label="공식 변화" value={String(result.analysis.metrics.changedOfficialSignals)} />
                <BriefMetric label="추적 회사" value={String(result.analysis.metrics.trackedCompaniesScanned)} />
                <BriefMetric label="오래된 기사" value={String(result.analysis.metrics.staleDocuments)} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">핵심 인사이트</h2>
              {result.analysis.insights.map((insight) => (
                <div key={insight.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LENS_STYLE[insight.lens]}`}>
                          {insight.lens}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[insight.priority]}`}>
                          {insight.priority}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900">{insight.title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-navy-custom">{insight.confidence}</p>
                      <p className="text-[10px] text-slate-400">confidence</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{insight.summary}</p>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Why It Matters</p>
                    <p className="mt-2 text-sm text-slate-700">{insight.whyItMatters}</p>
                  </div>
                </div>
              ))}
            </section>

            {diff && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">이번 브리프 변화</h2>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">새 인사이트</p>
                    {diff.newInsights.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {diff.newInsights.map((item) => (
                          <div key={item} className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">이전 브리프와 동일한 핵심 프레임입니다.</p>
                    )}
                  </div>

                  {diff.resolvedInsights.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">사라진 인사이트</p>
                      <div className="mt-2 space-y-2">
                        {diff.resolvedInsights.map((item) => (
                          <div key={item} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">활성 렌즈</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {diff.activeLenses.map((lens) => (
                        <span
                          key={lens}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LENS_STYLE[lens]}`}
                        >
                          {lens}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {result.analysis.officialSignals.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">공식 사이트 변화</h2>
                {result.analysis.officialSignals.map((signal) => (
                  <a
                    key={signal.id}
                    href={signal.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          signal.status === "changed"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {signal.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {signal.company}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {signal.sourceType}
                      </span>
                      {signal.changeTypes.map((changeType) => (
                        <span
                          key={`${signal.id}-${changeType}`}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                        >
                          {changeType}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{signal.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{signal.summary}</p>
                        {hasStructuredChanges(signal.structured) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {formatStructuredHighlights(signal.structured).map((item) => (
                              <span
                                key={`${signal.id}-${item}`}
                                className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-navy-custom">{signal.importance}</p>
                        <p className="text-[10px] text-slate-400">importance</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Recommended Next Step</p>
                      <p className="mt-2 text-sm text-slate-700">{signal.recommendation}</p>
                    </div>
                  </a>
                ))}
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">실행안</h2>
              {result.analysis.actions.map((action) => (
                <div key={action.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[action.priority]}`}>
                      {action.priority}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {action.owner}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {action.horizon}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">{action.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{action.rationale}</p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">근거</h2>
              {result.analysis.evidence.map((evidence) => (
                <a
                  key={evidence.id}
                  href={evidence.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LENS_STYLE[evidence.lens]}`}>
                      {evidence.lens}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {evidence.kind === "site-change" ? "site" : "news"}
                    </span>
                    {evidence.status && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {evidence.status}
                      </span>
                    )}
                    {evidence.changeTypes?.map((changeType) => (
                      <span
                        key={`${evidence.id}-${changeType}`}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                      >
                        {changeType}
                      </span>
                    ))}
                    <span className="text-[10px] text-slate-400">{evidence.source}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{evidence.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{evidence.summary}</p>
                  {hasStructuredChanges(evidence.structured) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formatStructuredHighlights(evidence.structured, 2).map((item) => (
                        <span
                          key={`${evidence.id}-${item}`}
                          className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-400">{evidence.whyRelevant}</p>
                </a>
              ))}
            </section>

            {result.analysis.watchouts.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">주의점</h2>
                {result.analysis.watchouts.map((watchout) => (
                  <div key={watchout} className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                    {watchout}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </MobileContainer>
  );
}

function BriefMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-white/70">{label}</p>
    </div>
  );
}
