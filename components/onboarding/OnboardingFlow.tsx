"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";

type OnboardingData = {
  goals: string[];
  keywords: string[];
  description: string;
  competitors: string[];
};

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    goals: [],
    keywords: [],
    description: "",
    competitors: [],
  });
  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem("temp_logged_in");
    if (!loggedIn) {
      router.push("/login");
    }
  }, [router]);

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleComplete = async () => {
    localStorage.setItem("onboardingData", JSON.stringify(data));
    localStorage.setItem("onboarded", "true");
    router.push("/");
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-0 md:p-4">
      <MobileContainer hideNavPadding>
        <div className="px-6 pt-4 pb-2">
          <div className="flex justify-between items-center mb-2">
            <button onClick={prevStep} className="text-slate-400 hover:text-primary transition-colors">
              <span className="material-icons">arrow_back_ios</span>
            </button>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{step} / 5 단계</span>
            <div className="w-6"></div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }}></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-32">
          {step === 1 && <StepGoals data={data} setData={setData} />}
          {step === 2 && <StepDescription data={data} setData={setData} />}
          {step === 3 && <StepKeywords data={data} setData={setData} />}
          {step === 4 && <StepCompetitors data={data} setData={setData} />}
          {step === 5 && <StepFinal data={data} />}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <div className="flex flex-col gap-3">
            <button 
              onClick={step === 5 ? handleComplete : nextStep}
              className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {step === 5 ? "시작하기" : "계속하기"}
            </button>
            <button className="w-full text-slate-400 font-medium py-2 text-sm hover:text-primary transition-colors">
              나중에 하기
            </button>
          </div>
          <div className="flex justify-center mt-4 pb-2">
            <div className="w-32 h-1 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      </MobileContainer>
    </div>
  );
}

function StepGoals({ data, setData }: { data: OnboardingData; setData: any }) {
  const goals = [
    { id: "market", title: "시장 확장", desc: "새로운 영토 및 인구 통계학적 변화 식별.", icon: "trending_up" },
    { id: "innov", title: "혁신 리더십", desc: "R&D 트렌드 및 파괴적 기술 조기 모니터링.", icon: "lightbulb" },
    { id: "ops", title: "운영 효율성", desc: "내부 프로세스 최적화 및 비용 절감.", icon: "speed" },
    { id: "comp", title: "경쟁 우위", desc: "라이벌의 움직임 및 가격 책정에 대한 실시간 알림.", icon: "security" },
    { id: "cust", title: "고객 유지", desc: "이탈 요인 및 충성도 트렌드 분석.", icon: "groups" },
  ];

  const toggleGoal = (id: string) => {
    const newGoals = data.goals.includes(id) 
      ? data.goals.filter(g => g !== id)
      : [...data.goals, id];
    setData({ ...data, goals: newGoals });
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">전략적 핵심 지표 정의</h1>
        <p className="text-slate-500 text-sm">이번 분기 비즈니스를 추진하는 주요 목표를 선택하세요.</p>
      </header>
      <div className="grid grid-cols-1 gap-4">
        {goals.map(goal => (
          <div 
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              data.goals.includes(goal.id) ? "border-primary bg-primary/5" : "border-slate-100 bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                data.goals.includes(goal.id) ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
              }`}>
                <span className="material-icons">{goal.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className={`font-semibold ${data.goals.includes(goal.id) ? "text-primary" : ""}`}>{goal.title}</h3>
                  {data.goals.includes(goal.id) && <span className="material-icons text-primary text-xl">check_circle</span>}
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

function StepDescription({ data, setData }: { data: OnboardingData; setData: any }) {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">회사 설명</h1>
        <p className="text-slate-500 text-sm">회사가 하는 일을 몇 문장으로 설명해주세요. 에이전트 분석의 기초가 됩니다.</p>
      </header>
      <textarea 
        className="w-full h-40 p-4 border-2 border-slate-100 rounded-xl focus:border-primary focus:ring-0 outline-none resize-none text-sm"
        placeholder="예: 동남아시아 이커머스 소매업체를 위한 지속 가능한 물류 솔루션을 제공합니다..."
        value={data.description}
        onChange={(e) => setData({ ...data, description: e.target.value })}
      />
    </>
  );
}

function StepKeywords({ data, setData }: { data: OnboardingData; setData: any }) {
  const [input, setInput] = useState("");
  const addKeyword = () => {
    if (input && !data.keywords.includes(input)) {
      setData({ ...data, keywords: [...data.keywords, input] });
      setInput("");
    }
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">시장 키워드</h1>
        <p className="text-slate-500 text-sm">산업 및 관심 분야와 관련된 키워드를 입력하세요.</p>
      </header>
      <div className="flex gap-2 mb-4">
        <input 
          className="flex-1 p-3 border-2 border-slate-100 rounded-xl focus:border-primary focus:ring-0 outline-none text-sm"
          placeholder="예: 생성형 AI, 물류 최적화"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
        />
        <button onClick={addKeyword} className="bg-primary text-white p-3 rounded-xl">
          <span className="material-icons">add</span>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.keywords.map(kw => (
          <span key={kw} className="bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-1">
            {kw}
            <button onClick={() => setData({ ...data, keywords: data.keywords.filter(k => k !== kw) })}>
              <span className="material-icons text-sm">close</span>
            </button>
          </span>
        ))}
      </div>
    </>
  );
}

function StepCompetitors({ data, setData }: { data: OnboardingData; setData: any }) {
  const [input, setInput] = useState("");
  const addCompetitor = () => {
    if (input && !data.competitors.includes(input)) {
      setData({ ...data, competitors: [...data.competitors, input] });
      setInput("");
    }
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-2">경쟁사 모니터링</h1>
        <p className="text-slate-500 text-sm">주요 경쟁사는 어디인가요? 그들의 움직임을 추적합니다.</p>
      </header>
      <div className="flex gap-2 mb-4">
        <input 
          className="flex-1 p-3 border-2 border-slate-100 rounded-xl focus:border-primary focus:ring-0 outline-none text-sm"
          placeholder="예: 경쟁사 A"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
        />
        <button onClick={addCompetitor} className="bg-primary text-white p-3 rounded-xl">
          <span className="material-icons">add</span>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.competitors.map(comp => (
          <span key={comp} className="bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-1">
            {comp}
            <button onClick={() => setData({ ...data, competitors: data.competitors.filter(c => c !== comp) })}>
              <span className="material-icons text-sm">close</span>
            </button>
          </span>
        ))}
      </div>
    </>
  );
}

function StepFinal({ data }: { data: OnboardingData }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
        <span className="material-icons text-4xl">verified</span>
      </div>
      <h1 className="text-2xl font-bold leading-tight mb-2">분석 준비 완료</h1>
      <p className="text-slate-500 text-sm mb-8">설정한 전략적 목표와 키워드를 바탕으로 레이더 구성을 마쳤습니다.</p>
      
      <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">전략 목표</p>
          <p className="text-sm font-semibold">{data.goals.length}개 선택됨</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">키워드</p>
          <p className="text-sm font-semibold">{data.keywords.join(", ") || "없음"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">경쟁사</p>
          <p className="text-sm font-semibold">{data.competitors.length}개 추적 중</p>
        </div>
      </div>
    </div>
  );
}
