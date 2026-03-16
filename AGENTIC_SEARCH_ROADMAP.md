# CeoRader Agentic Search Roadmap

## 1. Product Position

CeoRader is a `CEO research system`.

It should answer:

- what changed
- why it matters
- what should happen next

It should do this with:

- internal search logic
- official site monitoring
- local memory
- evidence-first analysis

It is not:

- a generic chatbot
- a wrapper around a paid search API
- a simple RSS summarizer

## 2. Current Architecture

### What is real today

- internal topic brief engine
- RSS query planning and ranking
- Playwright-based official site scan
- snapshot storage under `.ceorader/agentic`
- diff-based change detection
- structured extraction for pricing, messaging, hiring, partnership
- CEO brief and signal UI

### What is intentionally deferred

- DB
- real auth
- workspace/team model
- scheduler/alerts

### Current operating rule

- no paid external search API dependency
- memory-first local mode
- optional local Ollama assistance
- DB and auth later

## 3. What the System Already Does

### Planner

- create topic and competitor query plans
- infer search intent from keywords
- balance providers and intent coverage

### Collector

- fetch Google News RSS
- fetch Naver News RSS
- scan official sites with Playwright

### Filter

- remove stock/noise articles
- score freshness
- score keyword relevance
- diversify evidence across business lenses

### Change Detector

- store snapshots
- compare previous vs current content
- detect initial, changed, unchanged states

### Extractor

- detect pricing changes
- detect messaging shifts
- detect hiring changes
- detect partnership mentions

### Analyst

- map evidence to 5 CEO lenses
- build insight summaries
- attach why-it-matters
- generate action suggestions

## 4. What Still Needs to Become Stronger

### A. Signal Quality

- stronger extractor precision
- better dedupe for near-duplicate stories
- better ranking for CEO relevance
- deterministic competitor fallback instead of shallow summary fallback

### B. Correlation

- link news evidence and official-site changes into a single event
- identify when multiple pages describe the same move
- suppress repetitive signals

### C. Operational Surfaces

- `/company` should become source registry management
- `/customers` should become competitor timeline
- `/poc` should become run inspection and diff review
- `/finance` should become action board
- `/evaluation` should become coverage and failure diagnostics

## 5. Next-Generation Strategy

### Phase 1. Core Quality

Goal:
- make current signals more trustworthy

Build:
- source-type specific extractors
- relevance ranking improvements
- same-event clustering
- deterministic competitor evidence path

Outcome:
- fewer noisy signals
- clearer pricing/product/hiring changes

### Phase 2. Deeper Intelligence

Goal:
- move from change feed to business interpretation

Build:
- evidence correlation layer
- company-vs-competitor comparison
- action owner and horizon refinement
- local-model-assisted extraction where rules are weak

Outcome:
- stronger CEO recommendations
- better explanation of why a signal matters now

### Phase 3. Product Workflow

Goal:
- make the app usable as a weekly operating system

Build:
- real action objects from briefs and signals
- vault-to-action workflow
- run review surface
- watchlist timeline

Outcome:
- insight to decision to follow-up in one product loop

### Phase 4. Platform Layer

Goal:
- make it durable for teams

Build later:
- DB schema
- real auth
- workspace model
- permission model

Outcome:
- persistence and collaboration without changing the intelligence core

## 6. Technical Principle

The order should stay:

1. improve evidence quality
2. improve interpretation quality
3. improve workflow quality
4. add persistence and collaboration later

This prevents infrastructure work from outrunning signal quality.

## 7. Immediate Build Priorities

1. tighten structured extractors
2. correlate news and official-site signals
3. improve ranking and dedupe
4. turn thin pages into real operating views
5. postpone DB/auth until the intelligence loop is stable
