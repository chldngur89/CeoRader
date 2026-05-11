#!/usr/bin/env node
/**
 * AI 회사 기준 API 검증 스크립트.
 * 사용: npm run dev 띄운 뒤 다른 터미널에서 node scripts/verify-ai.mjs
 */
const BASE = process.env.VERIFY_BASE || "http://localhost:3000";

const AI_ONBOARDING = {
  topic: "AI",
  description: "AI 회사 시장 탐지 검증",
  keywords: ["AI"],
  companyName: "AI",
  companyWebsite: "",
  trackedCompanies: [{ id: "ai-verify-1", name: "AI", website: "" }],
  sourceLimit: 5,
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw: text };
  }
}

async function main() {
  console.log("=== CeoRader AI 회사 검증 (API) ===\n");
  let failed = 0;

  // 1) RSS 테스트
  console.log("1. GET /api/test-rss?keyword=AI");
  try {
    const rss = await fetchJson(`${BASE}/api/test-rss?keyword=AI`);
    if (!rss.ok) {
      console.log("   ❌ 실패:", rss.status, rss.raw?.slice(0, 80));
      failed++;
    } else {
      const count = rss.data?.items?.length ?? 0;
      console.log("   ✅ 성공, 기사 수:", count);
    }
  } catch (e) {
    console.log("   ❌ 오류:", e.message);
    failed++;
  }

  // 2) 분석 API (AI 회사 payload)
  console.log("\n2. POST /api/analyze (AI 회사 payload)");
  try {
    const analyze = await fetchJson(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: AI_ONBOARDING.topic,
        description: AI_ONBOARDING.description,
        keywords: AI_ONBOARDING.keywords,
        companyName: AI_ONBOARDING.companyName,
        companyWebsite: AI_ONBOARDING.companyWebsite,
        trackedCompanies: AI_ONBOARDING.trackedCompanies,
        sourceLimit: AI_ONBOARDING.sourceLimit,
      }),
    });

    if (!analyze.ok) {
      console.log("   ❌ 실패:", analyze.status, analyze.data?.message || analyze.raw?.slice(0, 80));
      failed++;
    } else {
      const d = analyze.data;
      const ok =
        d.success === true &&
        (d.useRealData === true || d.sources?.length > 0) &&
        (d.analysis?.events?.length > 0 || d.analysis?.insights?.length > 0);
      if (!ok) {
        console.log("   ❌ 응답 형식 이상:", {
          success: d.success,
          useRealData: d.useRealData,
          events: d.analysis?.events?.length,
          sources: d.sources?.length,
        });
        failed++;
      } else {
        console.log("   ✅ success:", d.success, "useRealData:", d.useRealData);
        console.log("   ✅ events:", d.analysis?.events?.length, "sources:", d.sources?.length);
      }
    }
  } catch (e) {
    console.log("   ❌ 오류:", e.message);
    failed++;
  }

  // 3) Favicon
  console.log("\n3. GET /favicon.ico");
  try {
    const fav = await fetch(`${BASE}/favicon.ico`);
    if (fav.status !== 200) {
      console.log("   ❌ 실패:", fav.status);
      failed++;
    } else {
      console.log("   ✅ 200 OK");
    }
  } catch (e) {
    console.log("   ❌ 오류:", e.message);
    failed++;
  }

  console.log("\n=== 결과:", failed === 0 ? "모두 통과 ✅" : `실패 ${failed}건 ❌`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
