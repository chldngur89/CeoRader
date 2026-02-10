"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "레이더", icon: "radar", path: "/" },
    { label: "시장신호", icon: "explore", path: "/signals" },
    { label: "금고", icon: "bookmark", path: "/vault" },
    { label: "설정", icon: "settings", path: "/config" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-200 px-8 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.path}
            className={`flex flex-col items-center gap-0.5 ${
              pathname === item.path ? "text-primary" : "text-slate-400"
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {item.icon}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-200 rounded-full z-[60]"></div>
    </>
  );
}
