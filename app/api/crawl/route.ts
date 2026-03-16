import path from "path";

import { NextResponse } from "next/server";

import { AGENTIC_ROOT, writeJsonFile } from "@/lib/agentic/storage";
import { radarSearch } from "@/lib/search/radar-search";
import { getSupabaseServiceClient } from "@/lib/supabase";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "topic";
}

export async function POST(req: Request) {
    const { topicId, query } = await req.json();

    if (!topicId || !query) {
        return NextResponse.json({ error: "Missing topicId or query" }, { status: 400 });
    }

    try {
        const search = await radarSearch({
            target: query,
            maxDocuments: 10,
        });

        const marketData = search.documents.map((result) => ({
            topic_id: topicId,
            source_url: result.link,
            title: result.title,
            content: result.snippet,
            published_at: result.pubDate || null,
            metadata: {
                score: result.score,
                provider: result.provider,
                query: result.query,
                intent: result.intent,
                freshness_score: result.freshnessScore,
                keyword_score: result.keywordScore,
                engine: "radar-search",
            },
        }));

        const crawlLogPath = path.join(AGENTIC_ROOT, "crawl-logs", `${toSlug(String(topicId))}.json`);
        await writeJsonFile(crawlLogPath, {
            topicId,
            query,
            marketData,
            providers: search.providers,
            queryCount: search.queries.length,
            freshness: search.freshness,
            timestamp: new Date().toISOString(),
        });

        const supabase = getSupabaseServiceClient();
        let storage = "local";

        if (supabase) {
            const { error } = await supabase.from("market_data").insert(marketData);
            if (!error) {
                storage = "local+supabase";
            } else {
                console.warn("Supabase insert skipped:", error.message);
            }
        }

        return NextResponse.json({
            message: "Crawling successful",
            count: marketData.length,
            engine: "radar-search",
            providers: search.providers,
            queryCount: search.queries.length,
            freshness: search.freshness,
            storage,
        });
    } catch (error: any) {
        console.error("Crawl Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
