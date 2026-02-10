"use client";

import MobileContainer from "@/components/layout/MobileContainer";
import BottomNav from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ConfigPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("onboarded");
    localStorage.removeItem("onboardingData");
    router.push("/login");
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem("onboarded");
    localStorage.removeItem("onboardingData");
    router.push("/onboarding");
  };

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">설정</h1>
      </header>

      <main className="flex-1 px-5 space-y-6">
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">계정 설정</h2>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <button 
              onClick={handleLogout}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 text-red-500 font-semibold"
            >
              로그아웃
              <span className="material-symbols-outlined text-lg text-slate-300">logout</span>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">서비스 설정</h2>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <button 
              onClick={handleResetOnboarding}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              온보딩 다시 진행하기
              <span className="material-symbols-outlined text-lg text-slate-300">refresh</span>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </MobileContainer>
  );
}
