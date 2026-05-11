#!/usr/bin/env node
/**
 * AI 회사 기준 E2E: /test/verify-ai → 클릭 → 홈에서 Hot Topics/Live Signals 노출 확인
 * 사용: npx playwright install 후, npm run dev 띄운 뒤 node scripts/verify-ai-e2e.mjs
 */
const BASE = process.env.VERIFY_BASE || "http://localhost:3000";

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}/test/verify-ai`, { waitUntil: "networkidle" });
    await page.click('button:has-text("AI 회사로 설정하고 홈으로 가기")');
    await page.waitForURL((url) => url.pathname === "/", { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    const hasHotTopics =
      (await page.locator('text=Hot Topics').count()) > 0 ||
      (await page.locator('text=Live Signals').count()) > 0;
    const hasTopicCard = (await page.locator('[class*="TopicCard"], [data-topic]').first().count()) > 0;
    const hasInsight = (await page.locator('text=인사이트').count()) > 0;

    if (hasHotTopics && (hasTopicCard || hasInsight)) {
      console.log("=== E2E AI 회사 검증: 통과 ✅");
      console.log("  - 홈 진입 성공");
      console.log("  - Hot Topics 또는 Live Signals 섹션 노출");
    } else {
      console.log("=== E2E AI 회사 검증: 일부 실패");
      console.log("  hasHotTopics:", hasHotTopics, "hasTopicCard:", hasTopicCard, "hasInsight:", hasInsight);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("E2E 오류:", e.message);
  process.exit(1);
});
