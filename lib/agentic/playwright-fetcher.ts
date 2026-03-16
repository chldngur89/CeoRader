import { createHash } from "crypto";

import { chromium, type Browser } from "playwright";

import type { TrackedSource } from "@/lib/agentic/source-registry";

export interface PageFetchSuccess {
  status: "success";
  url: string;
  finalUrl: string;
  attemptedUrls: string[];
  fetchedAt: string;
  httpStatus: number | null;
  title: string;
  metaDescription: string;
  headings: string[];
  text: string;
  excerpt: string;
  contentHash: string;
  lineCount: number;
}

export interface PageFetchFailure {
  status: "error";
  url: string;
  attemptedUrls: string[];
  fetchedAt: string;
  error: string;
}

export type PageFetchResult = PageFetchSuccess | PageFetchFailure;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const MAX_TEXT_LENGTH = 20000;

let browserPromise: Promise<Browser> | null = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
  }

  return browserPromise;
}

function normalizeText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

function buildHash(parts: string[]) {
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

export async function fetchTrackedSource(source: TrackedSource): Promise<PageFetchResult> {
  const browser = await getBrowser();
  const page = await browser.newPage({ userAgent: USER_AGENT });
  const attemptedUrls: string[] = [];
  let lastError = "Unable to fetch page";

  await page.route("**/*", (route) => {
    const resourceType = route.request().resourceType();
    if (resourceType === "image" || resourceType === "media" || resourceType === "font") {
      return route.abort();
    }
    return route.continue();
  });

  try {
    for (const candidateUrl of source.candidateUrls) {
      attemptedUrls.push(candidateUrl);

      try {
        const response = await page.goto(candidateUrl, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        const httpStatus = response?.status() ?? null;
        if (httpStatus !== null && httpStatus >= 400) {
          lastError = `HTTP ${httpStatus}`;
          continue;
        }

        await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => null);
        await page.waitForTimeout(700);

        const extracted = await page.evaluate(() => {
          const title = document.title?.trim() || "";
          const metaDescription =
            document
              .querySelector('meta[name="description"]')
              ?.getAttribute("content")
              ?.trim() || "";
          const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
            .map((item) => item.textContent?.trim() || "")
            .filter(Boolean)
            .slice(0, 20);
          const text = document.body?.innerText || "";

          return { title, metaDescription, headings, text };
        });

        const normalizedText = normalizeText(extracted.text).slice(0, MAX_TEXT_LENGTH);
        if (!extracted.title && normalizedText.length < 80) {
          lastError = "Page content too short";
          continue;
        }

        const excerpt = normalizedText.slice(0, 360);
        const title = normalizeText(extracted.title);
        const metaDescription = normalizeText(extracted.metaDescription);
        const headings = extracted.headings.map((item) => normalizeText(item)).filter(Boolean);

        return {
          status: "success",
          url: source.url,
          finalUrl: page.url(),
          attemptedUrls,
          fetchedAt: new Date().toISOString(),
          httpStatus,
          title,
          metaDescription,
          headings,
          text: normalizedText,
          excerpt,
          contentHash: buildHash([title, metaDescription, ...headings, normalizedText]),
          lineCount: normalizedText.split("\n").filter(Boolean).length,
        };
      } catch (error: any) {
        lastError = error?.message || "Navigation failed";
      }
    }

    return {
      status: "error",
      url: source.url,
      attemptedUrls,
      fetchedAt: new Date().toISOString(),
      error: lastError,
    };
  } finally {
    await page.close();
  }
}
