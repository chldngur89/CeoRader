"use client";

import { useState } from "react";

export default function CompetitorTest() {
  const [company, setCompany] = useState("CJ대한통운");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">경쟁사 분석 테스트</h1>
        
        <div className="space-y-4">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="회사명 입력"
          />
          
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "분석 중..." : "경쟁사 분석하기"}
          </button>

          {result && (
            <div className="mt-6 space-y-4">
              {result.error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                  에러: {result.error}
                </div>
              ) : (
                <>
                  <div className="p-4 bg-green-50 text-green-800 rounded-lg">
                    <p className="font-semibold">{result.company} 분석 완료</p>
                    <p className="text-sm">수집된 뉴스: {result.news?.length || 0}개</p>
                    {result.search?.queryCount ? (
                      <p className="text-sm">
                        내부 검색 쿼리: {result.search.queryCount}개 / 공급자: {(result.search.providers || []).join(", ")}
                      </p>
                    ) : null}
                  </div>

                  {result.analysis?.summary && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h3 className="font-semibold mb-2">요약</h3>
                      <p className="text-sm">{result.analysis.summary}</p>
                    </div>
                  )}

                  {result.news && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h3 className="font-semibold mb-2">최신 뉴스</h3>
                      <ul className="space-y-2 text-sm">
                        {result.news.map((n: any, i: number) => (
                          <li key={i} className="border-b pb-2">
                            <a href={n.link} target="_blank" className="text-blue-600 hover:underline">
                              {n.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
