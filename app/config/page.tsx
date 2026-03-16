"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import { clearDemoSessionCookie } from "@/lib/app/session";
import {
  STORAGE_KEYS,
  createTrackedCompany,
  joinValues,
  normalizeOnboardingData,
  serializeOnboardingData,
  splitValues,
  type OnboardingData,
} from "@/lib/app/state";

const GOAL_LABELS: Record<string, string> = {
  market: "시장 확장",
  innov: "혁신 리더십",
  ops: "운영 효율성",
  comp: "경쟁 우위",
  cust: "고객 유지",
};

function clearDerivedCache() {
  localStorage.removeItem(STORAGE_KEYS.analysis);
  localStorage.removeItem(STORAGE_KEYS.analysisSources);
  localStorage.removeItem(STORAGE_KEYS.analysisTopic);
  localStorage.removeItem(STORAGE_KEYS.analysisTime);
  localStorage.removeItem(STORAGE_KEYS.competitorScan);
  localStorage.removeItem(STORAGE_KEYS.radarCache);
}

export default function ConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<OnboardingData | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem(STORAGE_KEYS.user);
    const onboardingData = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (userData) setUser(JSON.parse(userData));
    if (onboardingData) {
      const parsed = normalizeOnboardingData(JSON.parse(onboardingData));
      setData(parsed);
      setEditData(parsed);
    }
  }, []);

  function handleLogout() {
    clearDerivedCache();
    clearDemoSessionCookie();
    localStorage.removeItem(STORAGE_KEYS.login);
    localStorage.removeItem(STORAGE_KEYS.user);
    router.push("/login");
  }

  function handleResetOnboarding() {
    clearDerivedCache();
    localStorage.removeItem(STORAGE_KEYS.onboarded);
    localStorage.removeItem(STORAGE_KEYS.onboarding);
    router.push("/onboarding");
  }

  function handleSave() {
    if (!editData) return;
    clearDerivedCache();
    const payload = serializeOnboardingData(editData);
    localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(payload));
    setData(normalizeOnboardingData(payload));
    setIsEditing(false);
  }

  function toggleGoal(goalId: string) {
    if (!editData) return;
    setEditData({
      ...editData,
      goals: editData.goals.includes(goalId)
        ? editData.goals.filter((goal) => goal !== goalId)
        : [...editData.goals, goalId],
    });
  }

  function updateTrackedCompany(id: string, field: "name" | "website", value: string) {
    if (!editData) return;
    setEditData({
      ...editData,
      trackedCompanies: editData.trackedCompanies.map((company) =>
        company.id === id ? { ...company, [field]: value } : company
      ),
    });
  }

  function addTrackedCompany() {
    if (!editData) return;
    setEditData({
      ...editData,
      trackedCompanies: [...editData.trackedCompanies, createTrackedCompany()],
    });
  }

  function removeTrackedCompany(id: string) {
    if (!editData) return;
    setEditData({
      ...editData,
      trackedCompanies:
        editData.trackedCompanies.length > 1
          ? editData.trackedCompanies.filter((company) => company.id !== id)
          : [createTrackedCompany()],
    });
  }

  return (
    <MobileContainer>
      <header className="px-5 py-4">
        <h1 className="text-2xl font-bold text-navy-custom tracking-tight">설정</h1>
        {user && <p className="text-sm text-slate-500 mt-1">{user.email}</p>}
      </header>

      <main className="flex-1 px-5 space-y-6 pb-24">
        <section className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">radar</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{data?.companyName || user?.name || "사용자"}</h2>
              <p className="text-white/70 text-sm">Agentic Radar 설정</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">추적 회사</span>
              <span>{data?.trackedCompanies.filter((item) => item.website.trim().length > 0).length || 0}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">저장 방식</span>
              <span>로컬 agentic state</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Radar Setup
            </h2>
            <button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              className="text-xs text-primary font-semibold"
            >
              {isEditing ? "저장" : "수정"}
            </button>
          </div>

          {isEditing ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">전략 목표</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GOAL_LABELS).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => toggleGoal(id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        editData?.goals.includes(id)
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">회사명</label>
                <input
                  value={editData?.companyName || ""}
                  onChange={(e) => setEditData({ ...editData!, companyName: e.target.value })}
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">회사 웹사이트</label>
                <input
                  value={editData?.companyWebsite || ""}
                  onChange={(e) => setEditData({ ...editData!, companyWebsite: e.target.value })}
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm"
                  placeholder="https://your-company.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">회사 설명</label>
                <textarea
                  value={editData?.description || ""}
                  onChange={(e) => setEditData({ ...editData!, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm resize-none h-24"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">키워드</label>
                <input
                  value={joinValues(editData?.keywords || [])}
                  onChange={(e) => setEditData({ ...editData!, keywords: splitValues(e.target.value) })}
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm"
                  placeholder="AI, pricing, enterprise"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 block">추적 대상</label>
                  <button onClick={addTrackedCompany} className="text-xs font-semibold text-primary">
                    + 추가
                  </button>
                </div>
                {editData?.trackedCompanies.map((company, index) => (
                  <div key={company.id} className="rounded-2xl border border-slate-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Target {index + 1}
                      </p>
                      <button onClick={() => removeTrackedCompany(company.id)} className="text-slate-400 hover:text-red-500">
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>
                    <input
                      value={company.name}
                      onChange={(e) => updateTrackedCompany(company.id, "name", e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl text-sm"
                      placeholder="회사명"
                    />
                    <input
                      value={company.website}
                      onChange={(e) => updateTrackedCompany(company.id, "website", e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl text-sm"
                      placeholder="공식 사이트 URL"
                    />
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400">
                웹사이트가 있어야 가격, 제품, 채용, 뉴스룸 페이지를 직접 추적할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs text-slate-400 mb-1">전략 목표</p>
                <p className="text-sm font-semibold">
                  {data?.goals.map((goal) => GOAL_LABELS[goal]).filter(Boolean).join(", ") || "미설정"}
                </p>
              </div>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs text-slate-400 mb-1">우리 회사</p>
                <p className="text-sm font-semibold">{data?.companyName || "미설정"}</p>
                {data?.companyWebsite && <p className="text-xs text-slate-500 mt-1">{data.companyWebsite}</p>}
              </div>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs text-slate-400 mb-1">키워드</p>
                <div className="flex flex-wrap gap-1">
                  {(data?.keywords || []).map((keyword) => (
                    <span key={keyword} className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-slate-400 mb-2">추적 대상</p>
                <div className="space-y-3">
                  {(data?.trackedCompanies || []).map((company) => (
                    <div key={company.id} className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{company.name || "미입력"}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {company.website || "웹사이트 미설정"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            서비스 설정
          </h2>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <button
              onClick={handleResetOnboarding}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50"
            >
              <span className="text-sm font-medium">온보딩 다시 진행하기</span>
              <span className="material-symbols-outlined text-lg text-slate-300">refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-red-500"
            >
              <span className="text-sm font-semibold">로그아웃</span>
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </MobileContainer>
  );
}
