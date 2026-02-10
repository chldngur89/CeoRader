import MobileContainer from "@/components/layout/MobileContainer";
import BottomNav from "@/components/layout/BottomNav";

export default function SignalsPage() {
  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">시장 신호</h1>
        <p className="text-slate-500 text-sm mt-1">실시간으로 감지된 업계의 주요 움직임입니다.</p>
      </header>

      <main className="flex-1 px-5 flex flex-col items-center justify-center text-center pb-20">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
          <span className="material-symbols-outlined text-3xl">explore</span>
        </div>
        <h3 className="font-bold text-slate-700">신호 분석 중</h3>
        <p className="text-xs text-slate-400 mt-2">에이전트가 새로운 시장 신호를<br />수집하고 있습니다.</p>
      </main>

      <BottomNav />
    </MobileContainer>
  );
}
