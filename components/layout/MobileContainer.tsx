export default function MobileContainer({ children, hideNavPadding }: { children: React.ReactNode; hideNavPadding?: boolean }) {
  return (
    <div className={`max-w-[430px] mx-auto min-h-screen bg-white shadow-2xl flex flex-col relative font-display text-slate-custom antialiased ${hideNavPadding ? "" : "pb-24"}`}>
      <div className="h-12 w-full flex justify-between items-center px-6 shrink-0 bg-white z-50">
        <span className="text-[15px] font-semibold text-slate-custom">9:41</span>
        <div className="flex gap-1.5 items-center text-slate-custom">
          <span className="material-symbols-outlined text-[18px]">signal_cellular_alt</span>
          <span className="material-symbols-outlined text-[18px]">wifi</span>
          <span className="material-symbols-outlined text-[18px]">battery_full</span>
        </div>
      </div>
      {children}
    </div>
  );
}
