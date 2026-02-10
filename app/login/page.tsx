"use client";

import { supabase } from "@/lib/supabase/client";
import MobileContainer from "@/components/layout/MobileContainer";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const handleGoogleLogin = async () => {
    localStorage.setItem("temp_logged_in", "true");
    router.push("/onboarding");
  };

  return (
    <MobileContainer hideNavPadding>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 text-primary">
          <span className="material-symbols-outlined text-4xl">radar</span>
        </div>
        
        <h1 className="text-3xl font-bold text-navy-custom mb-2">CeoRader</h1>
        <p className="text-slate-500 mb-12">CEO를 위한 실시간 시장 탐지 및<br />전략 분석 에이전트</p>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 hover:border-primary/30 transition-all active:scale-95 shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Google 계정으로 시작하기
        </button>

        <p className="mt-8 text-[11px] text-slate-400 leading-relaxed">
          계속함으로써 CeoRader의 서비스 이용약관 및<br />개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </MobileContainer>
  );
}
