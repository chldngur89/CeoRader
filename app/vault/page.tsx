"use client";

import { useEffect, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import { STORAGE_KEYS } from "@/lib/app/state";
import { normalizeVaultItems, type VaultItem } from "@/lib/app/vault";

const TYPE_CONFIG = {
  signal: { label: "신호", bg: "bg-blue-100", text: "text-blue-700" },
  action: { label: "액션", bg: "bg-green-100", text: "text-green-700" },
  brief: { label: "브리프", bg: "bg-slate-100", text: "text-slate-700" },
};

export default function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [filter, setFilter] = useState<"all" | "signal" | "action" | "brief">("all");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.vault);
    if (!raw) {
      setItems([]);
      return;
    }

    setItems(normalizeVaultItems(JSON.parse(raw)));
  }, []);

  function persist(nextItems: VaultItem[]) {
    setItems(nextItems);
    localStorage.setItem(STORAGE_KEYS.vault, JSON.stringify(nextItems));
  }

  function handleDelete(id: string) {
    persist(items.filter((item) => item.id !== id));
  }

  const filteredItems =
    filter === "all" ? items : items.filter((item) => item.type === filter);

  const weeklyDelta = (() => {
    if (items.length === 0) {
      return null;
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let currentTotal = 0;
    let previousTotal = 0;

    let currentSignals = 0;
    let previousSignals = 0;

    let currentActions = 0;
    let previousActions = 0;

    let currentBriefs = 0;
    let previousBriefs = 0;

    for (const item of items) {
      const ts = new Date(item.savedAt).getTime();
      if (Number.isNaN(ts)) continue;
      const diffDays = (now - ts) / dayMs;

      if (diffDays >= 0 && diffDays < 7) {
        currentTotal += 1;
        if (item.type === "signal") currentSignals += 1;
        if (item.type === "action") currentActions += 1;
        if (item.type === "brief") currentBriefs += 1;
      } else if (diffDays >= 7 && diffDays < 14) {
        previousTotal += 1;
        if (item.type === "signal") previousSignals += 1;
        if (item.type === "action") previousActions += 1;
        if (item.type === "brief") previousBriefs += 1;
      }
    }

    if (currentTotal === 0 && previousTotal === 0) {
      return null;
    }

    return {
      currentTotal,
      previousTotal,
      totalDelta: currentTotal - previousTotal,
      currentSignals,
      previousSignals,
      signalsDelta: currentSignals - previousSignals,
      currentActions,
      previousActions,
      actionsDelta: currentActions - previousActions,
      currentBriefs,
      previousBriefs,
      briefsDelta: currentBriefs - previousBriefs,
    };
  })();

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">금고</h1>
        <p className="text-slate-500 text-sm mt-1">저장한 시장 신호와 실행 메모입니다.</p>
        {weeklyDelta && (
          <div className="mt-3 inline-flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
              최근 7일 저장 {weeklyDelta.currentTotal}건
              {weeklyDelta.previousTotal > 0 && (
                <span
                  className={
                    weeklyDelta.totalDelta > 0
                      ? "text-emerald-600 ml-1"
                      : weeklyDelta.totalDelta < 0
                      ? "text-rose-600 ml-1"
                      : "text-slate-400 ml-1"
                  }
                >
                  ({weeklyDelta.totalDelta >= 0 ? "+" : ""}
                  {weeklyDelta.totalDelta} vs 직전 7일)
                </span>
              )}
            </span>
            {(weeklyDelta.currentSignals > 0 || weeklyDelta.previousSignals > 0) && (
              <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                신호 {weeklyDelta.currentSignals}건
                {weeklyDelta.previousSignals > 0 && (
                  <span
                    className={
                      weeklyDelta.signalsDelta > 0
                        ? "text-emerald-600 ml-1"
                        : weeklyDelta.signalsDelta < 0
                        ? "text-rose-600 ml-1"
                        : "text-blue-300 ml-1"
                    }
                  >
                    ({weeklyDelta.signalsDelta >= 0 ? "+" : ""}
                    {weeklyDelta.signalsDelta})
                  </span>
                )}
              </span>
            )}
            {(weeklyDelta.currentActions > 0 || weeklyDelta.previousActions > 0) && (
              <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                액션 {weeklyDelta.currentActions}건
                {weeklyDelta.previousActions > 0 && (
                  <span
                    className={
                      weeklyDelta.actionsDelta > 0
                        ? "text-emerald-600 ml-1"
                        : weeklyDelta.actionsDelta < 0
                        ? "text-rose-600 ml-1"
                        : "text-green-300 ml-1"
                    }
                  >
                    ({weeklyDelta.actionsDelta >= 0 ? "+" : ""}
                    {weeklyDelta.actionsDelta})
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: "all", label: "전체" },
            { key: "signal", label: "신호" },
            { key: "action", label: "액션" },
            { key: "brief", label: "브리프" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as typeof filter)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === item.key ? "bg-navy-custom text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-5 pb-24">
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const config = TYPE_CONFIG[item.type];

            return (
              <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                    {item.company && <span className="text-[10px] text-slate-400">{item.company}</span>}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>

                <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 mb-3 whitespace-pre-wrap">{item.content}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.savedAt).toLocaleString("ko-KR")}
                  </span>
                  {item.link ? (
                    <button
                      onClick={() => window.open(item.link, "_blank", "noopener,noreferrer")}
                      className="text-[11px] text-primary font-semibold"
                    >
                      원문 열기
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
              <span className="material-symbols-outlined text-3xl">folder_special</span>
            </div>
            <h3 className="font-bold text-slate-700">저장된 항목이 없습니다</h3>
            <p className="text-xs text-slate-400 mt-2">
              시장 신호에서 중요한 변화를 저장하면 여기 쌓입니다.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </MobileContainer>
  );
}
