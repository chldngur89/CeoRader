"use client";

import { useState } from "react";

export default function TestPage() {
  const [topic, setTopic] = useState("AI 물류");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function testOllama() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, description: "테스트 회사" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkHealth() {
    try {
      const res = await fetch("/api/analyze");
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Topic Brief 엔진 테스트</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">분석 주제</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={testOllama}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? "생성 중..." : "브리프 생성하기"}
            </button>
            <button
              onClick={checkHealth}
              className="px-4 bg-slate-200 text-slate-700 py-2 rounded-lg"
            >
              상태 확인
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              <p className="font-semibold">에러:</p>
              <p>{error}</p>
              <p className="mt-2 text-sm">
                로컬 모델 보조를 쓰려면 <code className="bg-red-100 px-1 rounded">ollama serve</code> 를 실행하세요.
              </p>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-green-50 text-green-800 rounded-lg">
                <p className="font-semibold">분석 완료!</p>
                <p className="text-sm">주제: {result.topic}</p>
              </div>

              {result.analysis?.summary && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold mb-2">요약</h3>
                  <p className="text-sm">{result.analysis.summary}</p>
                </div>
              )}

              {result.analysis?.events && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold mb-2">주요 이벤트</h3>
                  <ul className="space-y-2">
                    {result.analysis.events.map((e: any, i: number) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{e.title}</span>
                        <br />
                        <span className="text-slate-500">{e.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.analysis?.actions && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold mb-2">추천 액션</h3>
                  <ul className="space-y-2">
                    {result.analysis.actions.map((a: any, i: number) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{a.title}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          a.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {a.priority}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
