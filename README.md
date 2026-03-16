# CeoRader

CeoRader는 `뉴스 요약 앱`이 아니라 `CEO용 시장 탐지 시스템`입니다.

현재 제품은 다음 흐름으로 동작합니다.

1. 내부 검색 엔진이 주제와 경쟁사에 맞는 쿼리를 직접 만듭니다.
2. Google News RSS와 Naver News RSS에서 근거를 수집합니다.
3. Playwright가 공식 사이트를 읽고 이전 스냅샷과 비교합니다.
4. 변화 신호를 `가격`, `메시지`, `채용`, `제휴`로 구조화합니다.
5. CEO 브리프에서 `왜 중요한지`와 `지금 뭘 해야 하는지`를 보여줍니다.

## 현재 원칙

- 유료 외부 검색 API에 의존하지 않습니다.
- 메인 브리프 엔진은 내부 로직으로 동작합니다.
- Ollama는 선택적 로컬 모델 보조입니다.
- 저장은 당분간 `localStorage + .ceorader/agentic` 기반입니다.
- DB, 인증, 팀 기능은 후속 단계입니다.

## 지금 실제로 되는 것

- `/brief`: 토픽 CEO 브리프 생성
- `/signals`: 경쟁사/시장 신호 확인
- `/api/analyze`: 내부 topic brief 엔진
- `/api/competitor`: 경쟁사 검색 + 로컬 모델 보조 분석
- `agentic scan`: 공식 사이트 스냅샷, diff, structured change

## 엔진 구조

### 1. Internal Search

- query planning
- intent-based ranking
- noise filtering
- relevance scoring

핵심 파일:

- `lib/search/radar-search.ts`
- `lib/analysis/topic-brief.ts`

### 2. Official Site Radar

- tracked source registry
- Playwright fetch
- snapshot storage
- diff-based change detection
- structured extraction

핵심 파일:

- `lib/agentic/source-registry.ts`
- `lib/agentic/scan.ts`
- `lib/agentic/radar.ts`
- `lib/agentic/snapshot-store.ts`

### 3. Product Surfaces

- `/brief`: topic brief
- `/signals`: signal feed
- `/vault`: saved items
- `/company`, `/customers`, `/poc`, `/finance`, `/evaluation`: 운영 화면

## 개발 방향

### 지금 집중할 것

- extractor 정교화
- 뉴스/공식사이트 correlation
- 신호 랭킹
- competitor fallback 고도화
- 얇은 운영 화면 강화

### 나중에 붙일 것

- DB 스키마
- 실제 auth
- 팀/워크스페이스
- 스케줄러/알림

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 선택 사항: Ollama 로컬 모델 보조

메인 브리프 엔진은 Ollama 없이도 동작합니다.  
로컬 모델 보조까지 쓰려면:

```bash
brew install ollama
ollama serve
ollama pull llama3.1:latest
```

## 문서

- `TODO.md`: 현재 운영 원칙과 후속 과제
- `AGENTIC_SEARCH_ROADMAP.md`: 차세대 고도화 전략
