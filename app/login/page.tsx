"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import MobileContainer from "@/components/layout/MobileContainer";
import { setDemoSessionCookie } from "@/lib/app/session";
import { STORAGE_KEYS } from "@/lib/app/state";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    setIsLoading(true);

    const mockUser = {
      id: `user_${Date.now()}`,
      email: "ceo@company.com",
      name: "대표님",
      createdAt: new Date().toISOString(),
    };

    setDemoSessionCookie();
    localStorage.setItem(STORAGE_KEYS.login, "true");
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(mockUser));

    setTimeout(() => {
      setIsLoading(false);
      const onboarded = localStorage.getItem(STORAGE_KEYS.onboarded);
      router.push(onboarded ? "/" : "/onboarding");
    }, 400);
  };

  return (
    <MobileContainer hideNavPadding>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center mb-8 text-white shadow-lg shadow-primary/30">
          <span className="material-symbols-outlined text-5xl">radar</span>
        </div>

        <h1 className="text-3xl font-bold text-navy-custom mb-2">CeoRader</h1>
        <p className="text-slate-500 mb-2">
          CEO를 위한 agentic market radar
          <br />
          공식 사이트 변화와 경쟁 신호를 먼저 잡아냅니다
        </p>

        <div className="flex items-center gap-2 mb-12">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
            데모 액세스
          </span>
          <span className="text-[10px] text-slate-400">브라우저 로컬 상태로 바로 시작</span>
        </div>

        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 hover:border-primary/30 hover:bg-slate-50 transition-all active:scale-95 shadow-sm disabled:opacity-70"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-primary">rocket_launch</span>
          )}
          {isLoading ? "준비 중..." : "데모로 시작"}
        </button>

        <div className="mt-8 p-4 bg-slate-50 rounded-xl text-left w-full">
          <p className="text-[11px] font-bold text-slate-600 mb-2">현재 모드</p>
          <div className="space-y-1 text-[11px] text-slate-500">
            <p>공식 사이트 탐색: Playwright</p>
            <p>상태 저장: 로컬 `.ceorader/agentic`</p>
            <p>인증: 데모 세션</p>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}
