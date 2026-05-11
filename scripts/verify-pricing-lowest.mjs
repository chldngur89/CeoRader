#!/usr/bin/env node
/**
 * pricing.lowest 검증: lowestAlert REST + JSON-RPC, (선택) CeoRader 프록시
 *
 * 가장 쉬움 — lowestAlert만 (크롤 없음, 자동 기동):
 *   cd ../lowestAlert/server && npm run verify:pricing
 *
 * 수동으로 서버 띄울 때 (데모 응답, 빠름):
 *   PRICING_LOWEST_DEMO=true REDIS_ENABLED=false npx tsx src/index.js
 *
 * CeoRader 프록시까지:
 *   LOWEST_ALERT_API_BASE=http://127.0.0.1:3001 npm run dev
 *   LOWEST_BASE=... CEORADER_BASE=http://localhost:3000 node scripts/verify-pricing-lowest.mjs
 */
const LOWEST = (process.env.LOWEST_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");
const CEORADER = (process.env.CEORADER_BASE || "").replace(/\/$/, "");

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data };
}

function assertTaskShape(obj, label) {
  const d = obj?.data ?? obj?.result;
  if (!d || d.taskType !== "pricing.lowest") {
    throw new Error(`${label}: missing taskType pricing.lowest`);
  }
  if (!Array.isArray(d.offers)) throw new Error(`${label}: offers must be array`);
  if (!("lowestPrice" in d)) throw new Error(`${label}: lowestPrice missing`);
  if (!d.collectedAt) throw new Error(`${label}: collectedAt missing`);
  if (d.currency !== "KRW") throw new Error(`${label}: currency must be KRW`);
  console.log(`   ✅ ${label}: offers=${d.offers.length} lowestPrice=${d.lowestPrice}`);
}

function hint404() {
  console.log(`
   💡 404면 이 포트에 구버전 서버가 뜬 경우가 많습니다.
      lowestAlert: cd server && npm run verify:pricing  (권장)
      또는 PRICING_LOWEST_DEMO=true REDIS_ENABLED=false npx tsx src/index.js
`);
}

async function main() {
  console.log("=== pricing.lowest 검증 ===\n");
  let failed = 0;
  const payload = { productName: "테스트상품", category: "전자" };

  console.log("1. lowestAlert POST /api/pricing/lowest");
  try {
    const r = await postJson(`${LOWEST}/api/pricing/lowest`, payload);
    if (r.status === 404) {
      console.log("   ❌ 404 — 라우트 없음");
      hint404();
      failed++;
    } else if (!r.ok || !r.data.success) {
      console.log("   ❌", r.status, r.data);
      failed++;
    } else {
      assertTaskShape(r.data, "REST");
    }
  } catch (e) {
    console.log("   ❌", e.message);
    failed++;
  }

  console.log("\n2. lowestAlert POST /api/a2a (JSON-RPC pricing/lowest)");
  try {
    const r = await postJson(`${LOWEST}/api/a2a`, {
      jsonrpc: "2.0",
      id: "verify-1",
      method: "pricing/lowest",
      params: payload,
    });
    if (!r.ok || r.data.error) {
      console.log("   ❌", r.status, r.data);
      failed++;
    } else {
      assertTaskShape(r.data, "A2A");
    }
  } catch (e) {
    console.log("   ❌", e.message);
    failed++;
  }

  console.log("\n3. validation error (empty body)");
  try {
    const r = await postJson(`${LOWEST}/api/pricing/lowest`, {});
    if (r.status !== 400 || r.data.success) {
      console.log("   ❌ expected 400, got", r.status, r.data);
      failed++;
    } else {
      console.log("   ✅ 400 as expected");
    }
  } catch (e) {
    console.log("   ❌", e.message);
    failed++;
  }

  if (CEORADER) {
    console.log("\n4. CeoRader POST /api/pricing/lowest (proxy)");
    try {
      const r = await postJson(`${CEORADER}/api/pricing/lowest`, payload);
      if (!r.ok || !r.data.success) {
        console.log("   ❌", r.status, r.data);
        failed++;
      } else {
        assertTaskShape(r.data, "CeoRader");
      }
    } catch (e) {
      console.log("   ❌", e.message);
      failed++;
    }
  } else {
    console.log("\n4. CeoRader 프록시 스킵 (CEORADER_BASE 미설정)");
  }

  console.log("\n=== 결과:", failed === 0 ? "통과 ✅" : `실패 ${failed}건 ❌`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
