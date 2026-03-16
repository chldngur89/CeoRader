"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "레이더", icon: "radar", path: "/" },
    { label: "시장신호", icon: "notifications_active", path: "/signals" },
    { label: "금고", icon: "folder_special", path: "/vault" },
    { label: "설정", icon: "tune", path: "/config" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.path}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] py-1 ${
              pathname === item.path ? "text-primary" : "text-slate-400"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {item.icon}
            </span>
            <span className="text-[10px] font-bold">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
      <div className="h-16" />
    </>
  );
}
