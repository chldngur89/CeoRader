# CeoRader (Market Agent)

CEO를 위한 시장 탐지 및 전략 분석 에이전트 서비스입니다. Vercel과 Supabase를 기반으로 빠르게 배포할 수 있도록 구성되었습니다.

## 🚀 주요 기능 (5-Step Agent Flow)
1. **Topic Input**: CEO가 관심을 가지는 비즈니스 토픽/키워드 설정
2. **Context Expansion**: 관련 시장 데이터 수집 및 쿼리 확장
3. **Radar Agent**: 시장에서 발생하는 핵심 이벤트 탐지 ("무슨 일이 일어나는가?")
4. **Strategy Agent**: 비즈니스 영향도 및 중요성 분석 ("이게 왜 중요한가?")
5. **Opportunity Agent**: 구체적인 실행 방안 및 기회 도출 ("그래서 무엇을 할 것인가?")

## 🛠 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database/Auth**: Supabase
- **Deployment**: Vercel
- **AI Engine**: Vercel AI SDK + OpenAI / Anthropic
- **Data Sourcing**: Tavily Search API (AI Optimized Search)

## 📋 사용자 설정 가이드 (User Actions Required)
배포 및 실행을 위해 다음 단계가 필요합니다:

1. **Supabase 프로젝트 생성**: [Supabase Console](https://supabase.com)에서 새 프로젝트 생성 후 `supabase/schema.sql`의 SQL을 실행하세요.
2. **API Keys 설정**: `.env.local` 파일에 다음 키들을 설정하세요.
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키
   - `OPENAI_API_KEY`: OpenAI API 키 (또는 Anthropic)
   - `TAVILY_API_KEY`: [Tavily](https://tavily.com/) 검색 API 키 (시장 데이터 수집용)
3. **Vercel Cron Jobs**: 정기적인 배치 수집을 원할 경우 `vercel.json`에 크론 설정을 추가하세요.

## 📁 프로젝트 구조
- `/app`: Next.js App Router 및 API Routes
- `/lib/agents`: 3대 핵심 에이전트 로직 (Radar, Strategy, Opportunity)
- `/supabase`: DB 스키마 및 마이그레이션 파일
- `/components`: 대시보드 UI 컴포넌트
