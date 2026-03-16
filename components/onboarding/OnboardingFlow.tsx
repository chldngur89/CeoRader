"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import MobileContainer from "@/components/layout/MobileContainer";
import {
  STORAGE_KEYS,
  createTrackedCompany,
  hasConfiguredTrackedCompanies,
  normalizeOnboardingData,
  serializeOnboardingData,
  splitValues,
  type OnboardingData,
} from "@/lib/app/state";

type SetupStatus = "idle" | "preparing" | "completed" | "error";

const STEP_COUNT = 5;

function emptyOnboardingData(): OnboardingData {
  return {
    companyName: "",
    companyWebsite: "",
    goals: [],
    keywords: [],
    description: "",
    trackedCompanies: [createTrackedCompany()],
    competitors: [],
  };
}

function clearDerivedCache() {
  localStorage.removeItem(STORAGE_KEYS.analysis);
  localStorage.removeItem(STORAGE_KEYS.analysisSources);
  localStorage.removeItem(STORAGE_KEYS.analysisTopic);
  localStorage.removeItem(STORAGE_KEYS.analysisTime);
  localStorage.removeItem(STORAGE_KEYS.competitorScan);
  localStorage.removeItem(STORAGE_KEYS.radarCache);
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(emptyOnboardingData());
  const [setupStatus, setSetupStatus] = useState<SetupStatus>("idle");
  const [setupMessage, setSetupMessage] = useState("");

  useEffect(() => {
    const loggedIn = localStorage.getItem(STORAGE_KEYS.login);
    if (!loggedIn) {
      router.push("/login");
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (saved) {
      setData(normalizeOnboardingData(JSON.parse(saved)));
    }
  }, [router]);

  useEffect(() => {
    if (step === 5 && setupStatus === "idle") {
      void prepareTracking();
    }
  }, [step, setupStatus]);

  const validTrackedCompanies = useMemo(
    () =>
      data.trackedCompanies.filter(
        (item) => item.name.trim().length > 0 && item.website.trim().length > 0
      ),
    [data.trackedCompanies]
  );

  const namedTrackedCompanies = useMemo(
    () => data.trackedCompanies.filter((item) => item.name.trim().length > 0),
    [data.trackedCompanies]
  );

  const canAdvance =
    step === 1
      ? data.goals.length > 0
      : step === 2
        ? data.companyName.trim().length > 0 && data.description.trim().length > 0
        : step === 3
          ? data.keywords.length > 0
          : step === 4
            ? namedTrackedCompanies.length > 0
            : true;

  const nextStep = () => {
    if (!canAdvance) return;
    setStep((current) => Math.min(STEP_COUNT, current + 1));
  };

  const prevStep = () => {
    if (step === 1) return;
    setStep((current) => Math.max(1, current - 1));
  };

  async function prepareTracking() {
    setSetupStatus("preparing");
    setSetupMessage("공식 사이트 추적 소스를 준비하는 중입니다.");

    const payload = serializeOnboardingData(data);
    localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(payload));
    clearDerivedCache();

    try {
      const targets = [
        ...(data.companyWebsite.trim().length > 0
          ? [{ name: data.companyName || "우리 회사", website: data.companyWebsite }]
          : []),
        ...validTrackedCompanies.map((item) => ({
          name: item.name,
          website: item.website,
        })),
      ].slice(0, 5);

      for (const target of targets) {
        const response = await fetch("/api/agentic/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: target.name,
            website: target.website,
            includeDefaults: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message || `${target.name} 추적 소스 준비에 실패했습니다.`);
        }
      }

      setSetupStatus("completed");
      setSetupMessage("추적 소스 준비가 끝났습니다. 대시보드로 이동할 수 있습니다.");
    } catch (error: any) {
      setSetupStatus("error");
      setSetupMessage(error?.message || "추적 소스를 준비하지 못했습니다.");
    }
  }

  function completeOnboarding() {
    const payload = serializeOnboardingData(data);
    localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    router.push("/");
  }

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-0 md:p-4">
      <MobileContainer hideNavPadding>
        <div className="px-6 pt-4 pb-2">
          <div className="flex justify-between items-center mb-2">
            <button onClick={prevStep} className="text-slate-400 hover:text-primary transition-colors">
              <span className="material-icons">arrow_back_ios</span>
            </button>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {step} / {STEP_COUNT} 단계
            </span>
            <div className="w-6" />
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / STEP_COUNT) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-32">
          {step === 1 && <StepGoals data={data} setData={setData} />}
          {step === 2 && <StepCompany data={data} setData={setData} />}
          {step === 3 && <StepKeywords data={data} setData={setData} />}
          {step === 4 && <StepTrackedCompanies data={data} setData={setData} />}
          {step === 5 && (
            <StepFinal
              data={data}
              validTrackedCompanies={validTrackedCompanies.length}
              setupStatus={setupStatus}
              setupMessage={setupMessage}
              onRetry={prepareTracking}
            />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          {step === 5 ? (
            <button
              onClick={completeOnboarding}
              disabled={setupStatus !== "completed"}
              className={`w-full font-semibold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] ${
                setupStatus === "completed"
                  ? "bg-primary hover:bg-blue-700 text-white shadow-primary/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {setupStatus === "preparing" ? "추적 환경 준비 중..." : "대시보드로 이동"}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canAdvance}
              className={`w-full font-semibold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] ${
                canAdvance
                  ? "bg-primary hover:bg-blue-700 text-white shadow-primary/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              계속하기
            </button>
          )}
          <div className="flex justify-center mt-4 pb-2">
            <div className="w-32 h-1 bg-slate-200 rounded-full" />
          </div>
        </div>
      </MobileContainer>
    </div>
  );
}

function StepGoals({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: Dispatch<SetStateAction<OnboardingData>>;
}) {
  const goals = [
    { id: "market", title: "시장 확장", desc: "새로운 시장과 지역 확장 신호를 먼저 포착합니다.", icon: "trending_up" },
    { id: "innov", title: "혁신 리더십", desc: "경쟁 제품과 메시지 변화를 가장 빠르게 읽습니다.", icon: "lightbulb" },
    { id: "ops", title: "운영 효율성", desc: "가격, 채용, 파트너십 변화에서 실행 신호를 뽑습니다.", icon: "speed" },
    { id: "comp", title: "경쟁 우위", desc: "공식 사이트와 가격 페이지를 지속 추적합니다.", icon: "security" },
    { id: "cust", title: "고객 유지", desc: "시장 메시지 변화가 고객 이탈로 이어질지 판단합니다.", icon: "groups" },
  ];

  function toggleGoal(id: string) {
    setData((current) => ({
      ...current,
      goals: current.goals.includes(id)
        ? current.goals.filter((goal) => goal !== id)
        : [...current.goals, id],
    }));
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">무엇을 추적할지 정합니다</h1>
        <p className="text-slate-500 text-sm">Agentic search가 우선순위를 정할 전략 목표를 선택하세요.</p>
      </header>
      <div className="grid grid-cols-1 gap-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              data.goals.includes(goal.id) ? "border-primary bg-primary/5" : "border-slate-100 bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  data.goals.includes(goal.id) ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                <span className="material-icons">{goal.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className={`font-semibold ${data.goals.includes(goal.id) ? "text-primary" : ""}`}>
                    {goal.title}
                  </h3>
                  {data.goals.includes(goal.id) && (
                    <span className="material-icons text-primary text-xl">check_circle</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{goal.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StepCompany({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: Dispatch<SetStateAction<OnboardingData>>;
}) {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">우리 회사를 이해시킵니다</h1>
        <p className="text-slate-500 text-sm">회사 설명은 relevance 판단에, 웹사이트는 향후 자체 추적에 사용됩니다.</p>
      </header>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">회사명</label>
          <input
            className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-primary outline-none text-sm"
            placeholder="예: CeoRader"
            value={data.companyName}
            onChange={(e) => setData((current) => ({ ...current, companyName: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">회사 웹사이트</label>
          <input
            className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-primary outline-none text-sm"
            placeholder="예: https://ceorader.ai"
            value={data.companyWebsite}
            onChange={(e) => setData((current) => ({ ...current, companyWebsite: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">회사 설명</label>
          <textarea
            className="w-full h-40 p-4 border-2 border-slate-100 rounded-xl focus:border-primary outline-none resize-none text-sm"
            placeholder="예: 제조·물류 CEO를 위한 경쟁사 추적 및 전략 의사결정 소프트웨어를 제공합니다."
            value={data.description}
            onChange={(e) => setData((current) => ({ ...current, description: e.target.value }))}
          />
        </div>
      </div>
    </>
  );
}

function StepKeywords({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: Dispatch<SetStateAction<OnboardingData>>;
}) {
  const [input, setInput] = useState("");

  function addKeyword() {
    const nextValue = splitValues(input);
    if (nextValue.length === 0) return;

    setData((current) => ({
      ...current,
      keywords: Array.from(new Set([...current.keywords, ...nextValue])),
    }));
    setInput("");
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">중요 키워드를 넣습니다</h1>
        <p className="text-slate-500 text-sm">가격, 제품, 시장, 고객군 등 CEO가 신경 쓰는 키워드를 지정하세요.</p>
      </header>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 p-3 border-2 border-slate-100 rounded-xl focus:border-primary outline-none text-sm"
          placeholder="예: AI 물류, 가격 인상, enterprise"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addKeyword()}
        />
        <button onClick={addKeyword} className="bg-primary text-white p-3 rounded-xl">
          <span className="material-icons">add</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.keywords.map((keyword) => (
          <span
            key={keyword}
            className="bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-1"
          >
            {keyword}
            <button
              onClick={() =>
                setData((current) => ({
                  ...current,
                  keywords: current.keywords.filter((item) => item !== keyword),
                }))
              }
            >
              <span className="material-icons text-sm">close</span>
            </button>
          </span>
        ))}
      </div>
    </>
  );
}

function StepTrackedCompanies({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: Dispatch<SetStateAction<OnboardingData>>;
}) {
  function updateTrackedCompany(
    id: string,
    field: "name" | "website",
    value: string
  ) {
    setData((current) => ({
      ...current,
      trackedCompanies: current.trackedCompanies.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addTrackedCompany() {
    setData((current) => ({
      ...current,
      trackedCompanies: [...current.trackedCompanies, createTrackedCompany()],
    }));
  }

  function removeTrackedCompany(id: string) {
    setData((current) => ({
      ...current,
      trackedCompanies:
        current.trackedCompanies.length > 1
          ? current.trackedCompanies.filter((item) => item.id !== id)
          : [createTrackedCompany()],
    }));
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">관심 있는 회사를 적어둡니다</h1>
        <p className="text-slate-500 text-sm">
          회사 이름만 있어도 뉴스·시장 레이더에는 반영됩니다. 공식 홈페이지 URL까지 적어두면 나중에 agentic search가
          가격, 제품, 채용, 뉴스룸을 직접 추적할 수 있습니다.
        </p>
      </header>

      <div className="space-y-4">
        {data.trackedCompanies.map((company, index) => (
          <div key={company.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                추적 대상 {index + 1}
              </p>
              <button
                onClick={() => removeTrackedCompany(company.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <span className="material-icons text-sm">delete</span>
              </button>
            </div>

            <input
              className="w-full p-3 border border-slate-200 rounded-xl text-sm"
              placeholder="회사명"
              value={company.name}
              onChange={(e) => updateTrackedCompany(company.id, "name", e.target.value)}
            />
            <input
              className="w-full p-3 border border-slate-200 rounded-xl text-sm"
              placeholder="공식 사이트 URL"
              value={company.website}
              onChange={(e) => updateTrackedCompany(company.id, "website", e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={addTrackedCompany}
        className="mt-4 w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold"
      >
        + 추적 대상 추가
      </button>
    </>
  );
}

function StepFinal({
  data,
  validTrackedCompanies,
  setupStatus,
  setupMessage,
  onRetry,
}: {
  data: OnboardingData;
  validTrackedCompanies: number;
  setupStatus: SetupStatus;
  setupMessage: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">추적 환경을 준비합니다</h1>
        <p className="text-slate-500 text-sm">
          등록된 웹사이트가 있다면 공식 사이트 추적까지 준비하고, 없더라도 뉴스·시장 레이더는 바로 사용할 수 있습니다.
        </p>
      </header>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">우리 회사</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {data.companyName || "미입력"}
          </p>
          {data.companyWebsite && <p className="text-xs text-slate-500 mt-1">{data.companyWebsite}</p>}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">키워드</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.keywords.map((keyword) => (
              <span key={keyword} className="px-2 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">추적 대상</p>
          <p className="text-sm text-slate-700 mt-1">{validTrackedCompanies}개 공식 사이트 준비 완료</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <span
            className={`material-icons ${
              setupStatus === "completed"
                ? "text-green-600"
                : setupStatus === "error"
                  ? "text-red-500"
                  : "text-primary"
            }`}
          >
            {setupStatus === "completed"
              ? "check_circle"
              : setupStatus === "error"
                ? "error"
                : "sync"}
          </span>
          <p className="text-sm font-semibold text-slate-800">
            {setupStatus === "preparing"
              ? "소스 레지스트리 생성 중"
              : setupStatus === "completed"
                ? "준비 완료"
                : setupStatus === "error"
                  ? "준비 실패"
                  : "대기 중"}
          </p>
        </div>
        <p className="text-xs text-slate-500 mt-2">{setupMessage || "준비가 시작되면 여기 상태가 표시됩니다."}</p>
        {setupStatus === "error" && (
          <button onClick={() => void onRetry()} className="mt-3 text-sm font-semibold text-primary">
            다시 시도
          </button>
        )}
      </div>
    </>
  );
}
