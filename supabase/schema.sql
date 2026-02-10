-- CEO Market Radar Database Schema

-- 1. Topics: Users define what they want to track
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    keywords TEXT[], -- Array of keywords for better crawling
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Market Data: Raw information collected from web
CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    source_url TEXT,
    title TEXT,
    content TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Store extra info like relevance score, source type
);

-- 3. Analysis Results: Storing the output of the 3 agents
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    
    -- Radar Agent Output: "What's happening?"
    radar_summary TEXT,
    detected_events JSONB, -- List of key events/trends
    
    -- Strategy Agent Output: "Why it matters?"
    strategy_impact TEXT,
    significance_score INTEGER, -- 1 to 100
    
    -- Opportunity Agent Output: "What to do?"
    action_items JSONB, -- List of specific recommendations
    opportunities JSONB, -- Strategic opportunities
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_market_data_topic ON market_data(topic_id);
CREATE INDEX idx_analysis_results_topic ON analysis_results(topic_id);
