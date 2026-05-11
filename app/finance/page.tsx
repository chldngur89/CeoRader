"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import {
  normalizeActionItems,
  type ActionItem,
  type ActionOwner,
  type ActionPriority,
  type ActionStatus,
} from "@/lib/app/actions";
import { STORAGE_KEYS } from "@/lib/app/state";
import { normalizeVaultItems } from "@/lib/app/vault";

const STATUS_ORDER: ActionStatus[] = ["todo", "doing", "done"];
const STATUS_LABEL: Record<ActionStatus, string> = {
  todo: "Todo",
  doing: "Doing",
  done: "Done",
};

const PRIORITY_STYLE: Record<ActionPriority, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export default function PriorityBoardPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [filterOwner, setFilterOwner] = useState<"all" | ActionOwner>("all");
  const [filterPriority, setFilterPriority] = useState<"all" | ActionPriority>("all");
  const [vaultCount, setVaultCount] = useState(0);

  useEffect(() => {
    const rawActions = localStorage.getItem(STORAGE_KEYS.actions);
    const rawVault = localStorage.getItem(STORAGE_KEYS.vault);

    setActions(normalizeActionItems(rawActions ? JSON.parse(rawActions) : []));
    setVaultCount(normalizeVaultItems(rawVault ? JSON.parse(rawVault) : []).length);
  }, []);

  function persist(nextActions: ActionItem[]) {
    setActions(nextActions);
    localStorage.setItem(STORAGE_KEYS.actions, JSON.stringify(nextActions));

    const rawVault = localStorage.getItem(STORAGE_KEYS.vault);
    const vaultItems = normalizeVaultItems(rawVault ? JSON.parse(rawVault) : []);
    const nextVault = vaultItems.map((item) => {
      const linked = nextActions.find((action) => `vault-${action.id}` === item.id);
      return linked
        ? {
            ...item,
            actionStatus: linked.status,
            owner: linked.owner,
            horizon: linked.horizon,
            priority: linked.priority,
          }
        : item;
    });
    localStorage.setItem(STORAGE_KEYS.vault, JSON.stringify(nextVault));
  }

  function moveAction(actionId: string, status: ActionStatus) {
    persist(actions.map((action) => (action.id === actionId ? { ...action, status } : action)));
  }

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (filterOwner !== "all" && action.owner !== filterOwner) {
        return false;
      }
      if (filterPriority !== "all" && action.priority !== filterPriority) {
        return false;
      }
      return true;
    });
  }, [actions, filterOwner, filterPriority]);

  const actionsByStatus = useMemo(() => {
    return STATUS_ORDER.reduce<Record<ActionStatus, ActionItem[]>>(
      (accumulator, status) => ({
        ...accumulator,
        [status]: filteredActions
          .filter((action) => action.status === status)
          .sort((left, right) => {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            return priorityWeight[right.priority] - priorityWeight[left.priority];
          }),
      }),
      {
        todo: [],
        doing: [],
        done: [],
      }
    );
  }, [filteredActions]);

  const stats = {
    total: actions.length,
    todo: actions.filter((item) => item.status === "todo").length,
    doing: actions.filter((item) => item.status === "doing").length,
    done: actions.filter((item) => item.status === "done").length,
  };

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">액션 보드</h1>
        <p className="text-sm text-slate-500 mt-1">
          브리프와 신호에서 만든 실행 항목을 개인 보드에서 관리합니다.
        </p>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-5">
        <section className="grid grid-cols-4 gap-3">
          <Metric label="전체" value={String(stats.total)} />
          <Metric label="Todo" value={String(stats.todo)} />
          <Metric label="Doing" value={String(stats.doing)} />
          <Metric label="Done" value={String(stats.done)} />
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-600 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Personal Workflow</p>
          <h2 className="mt-2 text-2xl font-bold">
            {stats.total > 0 ? `${stats.todo}개가 아직 실행 대기 중입니다` : "아직 액션이 없습니다"}
          </h2>
          <p className="mt-3 text-sm text-white/80">
            액션은 `/brief`의 실행안과 `/signals`의 이벤트/신호에서 생성됩니다. 현재 금고 항목 {vaultCount}개가 저장되어 있습니다.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/brief" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">
              브리프 열기
            </Link>
            <Link href="/signals" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">
              신호 열기
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "CEO", "Product", "Sales", "Ops"] as const).map((owner) => (
              <button
                key={owner}
                onClick={() => setFilterOwner(owner)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  filterOwner === owner ? "bg-navy-custom text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {owner}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "high", "medium", "low"] as const).map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  filterPriority === priority ? "bg-navy-custom text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">{STATUS_LABEL[status]}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {actionsByStatus[status].length}
                </span>
              </div>

              {actionsByStatus[status].length > 0 ? (
                <div className="space-y-3">
                  {actionsByStatus[status].map((action) => (
                    <div key={action.id} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[action.priority]}`}>
                              {action.priority}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {action.owner}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {action.horizon}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {action.sourceKind}
                            </span>
                          </div>
                          <h3 className="mt-2 text-sm font-bold text-slate-900">{action.title}</h3>
                          <p className="mt-2 text-sm text-slate-600">{action.rationale}</p>
                          {action.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {action.tags.map((tag) => (
                                <span
                                  key={`${action.id}-${tag}`}
                                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          {action.company && <p>{action.company}</p>}
                          <p>{new Date(action.createdAt).toLocaleDateString("ko-KR")}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {STATUS_ORDER.filter((item) => item !== status).map((nextStatus) => (
                          <button
                            key={`${action.id}-${nextStatus}`}
                            onClick={() => moveAction(action.id, nextStatus)}
                            className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            {STATUS_LABEL[nextStatus]}로 이동
                          </button>
                        ))}
                        {action.link && (
                          <button
                            onClick={() => window.open(action.link, "_blank", "noopener,noreferrer")}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                          >
                            근거 열기
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  이 상태의 액션이 없습니다.
                </div>
              )}
            </div>
          ))}
        </section>
      </main>

      <BottomNav />
    </MobileContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}
