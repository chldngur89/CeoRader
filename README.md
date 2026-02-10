# CeoRader - CEO 시장 탐지 및 전략 분석 에이전트

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Supabase-Auth/DB-green?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/OpenAI-GPT4-412991?style=flat-square&logo=openai" />
</p>

**CeoRader**는 CEO와 전략 담당자를 위한 AI 기반 시장 탐지 및 전략 분석 서비스입니다. 3단계 AI 에이전트 시스템을 통해 시장에서 발생하는 핵심 이벤트를 자동으로 탐지하고, 비즈니스 영향도를 분석하며, 구체적인 실행 방안을 제시합니다.

---

## 🎯 비즈니스 플로우 (User Journey)

### 1️⃣ 온보드 (Onboarding) - 5단계 설정
사용자는 서비스 시작 시 자신의 비즈니스 컨텍스트를 설정합니다.

| 단계 | 입력 항목 | 목적 |
|------|----------|------|
| **Step 1** | 전략적 핵심 지표 선택 | 시장 확장, 혁신 리더십, 운영 효율성, 경쟁 우위, 고객 유지 중 선택 |
| **Step 2** | 회사 설명 입력 | 비즈니스 도메인과 가치 제안을 파악하여 맞춤형 분석 제공 |
| **Step 3** | 시장 키워드 등록 | 관심 산업/기술/트렌드 키워드 (예: "생성형 AI", "물류 최적화") |
| **Step 4** | 경쟁사 모니터링 | 주요 경쟁사 등록하여 움직임 추적 |
| **Step 5** | 설정 완료 확인 | 입력 정보 요약 및 서비스 시작 |

### 2️⃣ 대시보드 (Dashboard) - 메인 화면
온보드 완료 후 사용자는 개인화된 시장 인텔리전스 대시보드를 확인합니다.

- **핫 토픽 (Top 10)**: 사용자 설정 키워드 기반 인기 토픽 리스트
- **전략 인사이트**: AI가 분석한 핵심 시장 동향 및 영향도
- **관련 인텔리전스**: 뉴스/리포트 원문 링크 제공
- **실행 가능한 다음 단계**: 구체적인 액션 아이템 제안

### 3️⃣ 3단계 AI 에이전트 시스템 (Core Engine)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CeoRader Agent Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │  Radar   │───▶│ Strategy │───▶│Opportunity│                 │
│   │  Agent   │    │  Agent   │    │  Agent    │                 │
│   └──────────┘    └──────────┘    └──────────┘                 │
│        │               │               │                        │
│        ▼               ▼               ▼                        │
│   "무슨 일이       "이게 왜       "그래서 무엇을               │
│    일어나는가?"    중요한가?"      할 것인가?"                  │
│                                                                  │
│   • 시장 이벤트    • 영향도 분석    • 구체적 액션               │
│   • 트렌드 탐지    • 중요성 점수    • 기회 도출                 │
│   • 경쟁사 동향    • 리스크 평가    • 실행 로드맵               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**에이전트 상세:**

| 에이전트 | 역할 | 출력물 |
|----------|------|--------|
| **Radar Agent** | Tavily API로 수집된 시장 데이터에서 핵심 이벤트와 트렌드 탐지 | 시장 요약, 감지된 이벤트 목록 |
| **Strategy Agent** | 탐지된 이벤트가 사용자 비즈니스에 미치는 영향 분석 | 영향도 분석, 중요성 점수 (1-100) |
| **Opportunity Agent** | 전략 분석을 바탕으로 구체적인 실행 방안 및 기회 도출 | 액션 아이템, 기회 목록 |

### 4️⃣ 데이터 수집 및 분석 플로우

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   사용자    │     │   Tavily    │     │  Supabase   │     │   OpenAI    │
│   설정      │────▶│   Search    │────▶│   저장      │────▶│   분석      │
│  (키워드)   │     │  (크롤링)   │     │ (Raw Data)  │     │ (3 Agents)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                 │
                                                                 ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   대시보드   │◀────│  결과 저장   │◀────│  분석 완료   │
│   표시      │     │ (Analysis)  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 5️⃣ 네비게이션 구조

```
┌──────────────────────────────────────┐
│            Bottom Navigation          │
├──────────┬──────────┬──────────┬─────┤
│  레이더   │ 시장신호  │   금고   │ 설정 │
│  (홈)    │ (Signals)│ (Vault) │     │
├──────────┼──────────┼──────────┼─────┤
│ 대시보드  │ 실시간    │ 저장된   │ 설정 │
│ • 핫토픽 │  시장     │ 리포트   │     │
│ • 인사이트│  알림     │ • 북마크 │     │
│ • 액션   │          │          │     │
└──────────┴──────────┴──────────┴─────┘
```

---

## 🏗 시스템 아키텍처

### 기술 스택

| 레이어 | 기술 | 용도 |
|--------|------|------|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS | SSR/SPA 하이브리드 UI |
| **Auth** | Supabase Auth | Google OAuth 로그인 |
| **Database** | Supabase PostgreSQL | 사용자, 토픽, 시장데이터, 분석결과 저장 |
| **AI Engine** | OpenAI GPT-4 Turbo | 3단계 에이전트 분석 |
| **Search** | Tavily API | AI 최적화 시장 데이터 수집 |
| **State** | React Hooks + LocalStorage | 클라이언트 상태 관리 |

### 데이터베이스 스키마

```sql
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   topics    │────▶│ market_data │────▶│analysis_results │
│  (토픽)     │     │ (시장데이터) │     │   (분석결과)    │
├─────────────┤     ├─────────────┤     ├─────────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)         │
│ name        │     │ topic_id FK │     │ topic_id FK     │
│ description │     │ source_url  │     │ radar_summary   │
│ keywords[]  │     │ title       │     │ detected_events │
│ is_active   │     │ content     │     │ strategy_impact │
│ created_at  │     │ metadata    │     │ action_items[]  │
└─────────────┘     │ collected_at│     │ opportunities[] │
                    └─────────────┘     │ significance    │
                                        └─────────────────┘
```

### API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/crawl` | POST | Tavily API로 시장 데이터 수집 및 저장 |
| `/api/analyze` | POST | 3단계 AI 에이전트 실행 및 결과 저장 |
| `/auth/callback` | GET | Supabase OAuth 콜백 처리 |

---

## 📁 프로젝트 구조

```
ceorader/
├── app/
│   ├── page.tsx                 # 메인 대시보드
│   ├── layout.tsx               # 루트 레이아웃
│   ├── globals.css              # 전역 스타일
│   ├── login/
│   │   └── page.tsx             # 로그인 페이지
│   ├── onboarding/
│   │   └── page.tsx             # 온보딩 페이지
│   ├── signals/
│   │   └── page.tsx             # 시장 신호 페이지
│   ├── vault/
│   │   └── page.tsx             # 금고 페이지
│   ├── config/
│   │   └── page.tsx             # 설정 페이지
│   ├── api/
│   │   ├── crawl/
│   │   │   └── route.ts         # 데이터 수집 API
│   │   └── analyze/
│   │       └── route.ts         # AI 분석 API
│   └── auth/callback/
│       └── route.ts             # OAuth 콜백
├── components/
│   ├── layout/
│   │   ├── MobileContainer.tsx  # 모바일 컨테이너
│   │   └── BottomNav.tsx        # 하단 네비게이션
│   ├── onboarding/
│   │   └── OnboardingFlow.tsx   # 5단계 온보딩
│   └── dashboard/
│       ├── TopicCard.tsx        # 토픽 카드
│       ├── InsightSection.tsx   # 인사이트 섹션
│       └── ActionStepCard.tsx   # 액션 아이템 카드
├── lib/
│   ├── supabase/
│   │   └── client.ts            # Supabase 클라이언트
│   ├── supabase.ts              # Supabase 서버 유틸
│   └── agents/
│       └── engine.ts            # 3단계 AI 에이전트 엔진
├── supabase/
│   └── schema.sql               # DB 스키마
├── middleware.ts                # 인증 미들웨어
├── next.config.mjs              # Next.js 설정
├── tailwind.config.ts           # Tailwind 설정
└── package.json
```

---

## 🚀 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Tavily (시장 데이터 수집)
TAVILY_API_KEY=your_tavily_api_key
```

### 2. 데이터베이스 설정

Supabase Console에서 새 프로젝트를 생성하고 `supabase/schema.sql`의 SQL을 실행하세요.

### 3. 개발 서버 실행

```bash
npm install
npm run dev
```

### 4. 배포

Vercel에 연결하여 자동 배포를 설정하거나:

```bash
npm run build
```

---

## 🎨 디자인 시스템

### 색상 팔레트

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--primary` | `#2563eb` | 주요 액션, 활성 상태 |
| `--navy-custom` | `#1e293b` | 헤더 텍스트 |
| `--background` | `#f8fafc` | 페이지 배경 |
| `--card` | `#ffffff` | 카드 배경 |
| `--muted` | `#64748b` | 보조 텍스트 |

### 타이포그래피

- **헤딩**: Pretendard/Inter, 700 weight
- **본문**: Pretendard/Inter, 400 weight
- **캡션**: 10-11px, uppercase, tracking-widest

---

## 📄 라이선스

MIT License © 2024 CeoRader Team

---

<p align="center">
  Made with ❤️ for CEOs who want to stay ahead of the market
</p>
