"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";
import BottomNav from "@/components/layout/BottomNav";
import TopicCard, { TopicData } from "@/components/dashboard/TopicCard";
import InsightSection, { InsightData } from "@/components/dashboard/InsightSection";
import ActionStepCard, { ActionStep } from "@/components/dashboard/ActionStepCard";

const MOCK_TOPICS: TopicData[] = [
  {
    id: "1",
    name: "공급망 내 생성형 AI 활용",
    score: 94,
    type: "Opportunity",
    rank: 1,
    trend: "up"
  },
  {
    id: "2",
    name: "포스트 양자 암호화 대응",
    score: 78,
    type: "Threat",
    rank: 2,
    trend: "flat"
  },
  {
    id: "3",
    name: "지속 가능한 항공 연료(SAF) 시장",
    score: 82,
    type: "Opportunity",
    rank: 3,
    trend: "up"
  }
];

const MOCK_INSIGHT: InsightData = {
  title: "생성형 AI의 전략적 영향",
  relevance: 94,
  summary: "거대언어모델(LLM)이 물류 라우팅을 재정의하고 있습니다. 현재 내부 벤치마크 결과 AI를 도입한 경쟁사 대비 24%의 효율성 격차가 발생하고 있으며, 이는 시장 진입의 결정적인 창(Window)을 의미합니다.",
  relatedIntelligence: [
    {
      title: "글로벌 물류: AI 우선 라우팅 도입",
      source: "로이터",
      time: "4시간 전",
      type: "primary"
    },
    {
      title: "가트너: SCM AI 지출 200억 달러 예상",
      source: "마켓워치",
      time: "12시간 전",
      type: "secondary"
    }
  ],
  strategicActions: [
    {
      id: "a1",
      title: "파일럿 프로젝트",
      description: "APAC 노선 대상 LLM 기반 배차 시스템 도입"
    },
    {
      id: "a2",
      title: "인재 확보",
      description: "공급망 최적화를 위한 프롬프트 엔지니어 3명 채용"
    }
  ]
};

const MOCK_ACTIONS: ActionStep[] = [
  {
    id: "s1",
    title: "동적 통로 최적화",
    problem: "수동 부하 분산으로 인해 비성수기 매출의 15%가 누수됨.",
    proposal: "공카고 용량에 대한 AI 기반 실시간 입찰 에이전트 배포.",
    impact: "마진 12% 증가 예상",
    tags: ["물류", "매출"],
    icon: "rocket_launch",
    impactColor: "text-green-600"
  },
  {
    id: "s2",
    title: "통합 AI 거버넌스",
    problem: "파편화된 AI 도입으로 인한 섀도우 IT 및 기술 부채 발생.",
    proposal: "모델 감사 및 배포 통합을 위한 중앙 COE(Center of Excellence) 설립.",
    impact: "리스크 완화",
    tags: ["운영", "보안"],
    icon: "shield_person"
  }
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem("temp_logged_in");
    const onboarded = localStorage.getItem("onboarded");
    const data = localStorage.getItem("onboardingData");

    if (!loggedIn) {
      router.push("/login");
    } else if (!onboarded) {
      router.push("/onboarding");
    } else {
      if (data) setOnboardingData(JSON.parse(data));
      setLoading(false);
    }
  }, [router]);

  if (loading) return null;

  const mainTopic = onboardingData?.keywords?.[0] || "공급망 내 생성형 AI 활용";
  const personalizedInsight = {
    ...MOCK_INSIGHT,
    title: `${mainTopic} 전략적 분석`,
    summary: onboardingData?.description 
      ? `${onboardingData.description.slice(0, 100)}... 기반으로 분석한 결과, 해당 분야에서 경쟁사 대비 기술적 우위를 점할 수 있는 결정적인 기회가 포착되었습니다.`
      : MOCK_INSIGHT.summary
  };

  const personalizedTopics = [
    { ...MOCK_TOPICS[0], name: mainTopic },
    ...MOCK_TOPICS.slice(1)
  ];

  return (
    <MobileContainer>
      <header className="px-5 py-2 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-navy-custom tracking-tight">CeoRader</h1>
          <div className="flex bg-slate-200/50 p-1 rounded-lg">
            <button className="px-3 py-1 text-[10px] font-bold text-navy-custom bg-white shadow-sm rounded-md">7일</button>
            <button className="px-3 py-1 text-[10px] font-bold text-slate-500">30일</button>
            <button className="px-3 py-1 text-[10px] font-bold text-slate-500">90일</button>
          </div>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-sm" 
            placeholder={onboardingData?.keywords?.join(", ") || "비즈니스 키워드 검색..."} 
            type="text"
          />
        </div>
      </header>

      <section className="mt-6">
        <div className="px-5 flex justify-between items-center mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">핫 토픽 • TOP 10</h2>
          <span className="material-symbols-outlined text-slate-400 text-lg">filter_list</span>
        </div>
        <div className="flex overflow-x-auto px-5 gap-3 no-scrollbar pb-2">
          {personalizedTopics.map((topic, idx) => (
            <TopicCard key={topic.id} topic={topic} isActive={idx === 0} />
          ))}
        </div>
      </section>

      <main className="px-5 mt-6">
        <InsightSection data={personalizedInsight} />
      </main>

      <section className="mt-8 mb-4">
        <div className="px-5 mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">실행 가능한 다음 단계</h2>
        </div>
        <div className="flex overflow-x-auto px-5 gap-4 no-scrollbar">
          {MOCK_ACTIONS.map(step => (
            <ActionStepCard key={step.id} step={step} />
          ))}
        </div>
      </section>

      <BottomNav />
    </MobileContainer>
  );
}
