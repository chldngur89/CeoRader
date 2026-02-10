import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MarketAgentEngine } from '@/lib/agents/engine';

export async function POST(req: Request) {
    const { topicId } = await req.json();

    if (!topicId) {
        return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });
    }

    try {
        // 1. Fetch raw market data for the topic
        const { data: rawData, error: dbError } = await supabase
            .from('market_data')
            .select('content, title')
            .eq('topic_id', topicId)
            .order('collected_at', { ascending: false })
            .limit(10);

        if (dbError) throw dbError;
        if (!rawData || rawData.length === 0) {
            return NextResponse.json({ error: 'No market data found. Run crawl first.' }, { status: 404 });
        }

        // 2. Prepare data for agents
        const topicInfo = await supabase.from('topics').select('name').eq('id', topicId).single();
        const combinedText = rawData.map(d => `[${d.title}] ${d.content}`).join('\n');

        // 3. Run Agent Engine (Radar -> Strategy -> Opportunity)
        const engine = new MarketAgentEngine();
        const analysis = await engine.fullFlow(topicInfo.data?.name || 'Market Analysis', [combinedText]);

        // 4. Save results to Supabase
        const { error: insertError } = await supabase.from('analysis_results').insert({
            topic_id: topicId,
            radar_summary: analysis.radar.summary || JSON.stringify(analysis.radar),
            detected_events: analysis.radar.events || analysis.radar,
            strategy_impact: analysis.strategy.impact || JSON.stringify(analysis.strategy),
            significance_score: analysis.strategy.score || 70,
            action_items: analysis.opportunity.action_items || [],
            opportunities: analysis.opportunity.opportunities || []
        });

        if (insertError) throw insertError;

        return NextResponse.json({ message: 'Analysis complete', analysis });
    } catch (error: any) {
        console.error('Analysis Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
