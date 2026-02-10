import MobileContainer from "@/components/layout/MobileContainer";
import BottomNav from "@/components/layout/BottomNav";

export default function VaultPage() {
  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">금고 (Vault)</h1>
        <p className="text-slate-500 text-sm mt-1">저장된 전략 리포트와 분석 결과입니다.</p>
      </header>

      <main className="flex-1 px-5 flex flex-col items-center justify-center text-center pb-20">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
          <span className="material-symbols-outlined text-3xl">bookmark</span>
        </div>
        <h3 className="font-bold text-slate-700">저장된 내용 없음</h3>
        <p className="text-xs text-slate-400 mt-2">나중에 다시 확인하고 싶은 분석 결과의<br />북마크 아이콘을 눌러보세요.</p>
      </main>

      <BottomNav />
    </MobileContainer>
  );
}
