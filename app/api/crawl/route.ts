import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    const { topicId, query } = await req.json();

    if (!topicId || !query) {
        return NextResponse.json({ error: 'Missing topicId or query' }, { status: 400 });
    }

    try {
        // Tavily API Call (AI-optimized search)
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                search_depth: "advanced",
                include_answer: true,
                max_results: 5
            })
        });

        const data = await response.json();
        
        // Save raw results to Supabase
        const marketData = data.results.map((result: any) => ({
            topic_id: topicId,
            source_url: result.url,
            title: result.title,
            content: result.content,
            metadata: { score: result.rescore }
        }));

        const { error } = await supabase.from('market_data').insert(marketData);
        if (error) throw error;

        return NextResponse.json({ message: 'Crawling successful', count: marketData.length });
    } catch (error: any) {
        console.error('Crawl Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
