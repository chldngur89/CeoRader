"use client";

import { useRouter } from "next/navigation";
import { setDemoSessionCookie } from "@/lib/app/session";
import { STORAGE_KEYS } from "@/lib/app/state";
import type { OnboardingData } from "@/lib/app/state";

const AI_ONBOARDING: OnboardingData = {
  companyName: "AI",
  companyWebsite: "",
  goals: ["시장 동향 파악"],
  keywords: ["AI"],
  description: "AI 회사 시장 탐지 검증",
  trackedCompanies: [{ id: "ai-verify-1", name: "AI", website: "" }],
  competitors: ["AI"],
};

export default function VerifyAIPage() {
  const router = useRouter();

  function handleSetAIAndGoHome() {
    setDemoSessionCookie();
    localStorage.setItem(STORAGE_KEYS.login, "true");
    localStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({
        id: "user_verify_ai",
        email: "ceo@ai.company",
        name: "AI 대표",
        createdAt: new Date().toISOString(),
      })
    );
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(AI_ONBOARDING));
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <h1 className="text-xl font-bold text-navy-custom mb-2">AI 회사 검증</h1>
      <p className="text-slate-600 text-sm mb-6 text-center">
        아래 버튼을 누르면 로그인 + 온보딩을 &quot;AI&quot; 회사로 설정한 뒤 홈으로 이동합니다.
        <br />
        홈에서 Hot Topics(실제 뉴스 기반)가 로드되는지 확인하세요.
      </p>
      <button
        type="button"
        onClick={handleSetAIAndGoHome}
        className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 active:scale-95"
      >
        AI 회사로 설정하고 홈으로 가기
      </button>
    </div>
  );
}
