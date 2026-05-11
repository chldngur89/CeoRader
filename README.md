# CeoRader

CeoRader는 `뉴스 요약 앱`이 아니라 `CEO용 agentic market radar`입니다.

핵심 목표는 이겁니다.

- 시장과 경쟁사 변화를 먼저 찾는다
- 공식 사이트 변화와 뉴스 근거를 같이 본다
- 그 변화를 CEO 관점의 인사이트와 액션으로 바꾼다
- 외부 유료 검색 API 없이 내부 엔진 중심으로 운영한다

---

## 1. 현재 상태

`2026-04-15` 기준으로 현재 앱은 다음 단계까지 와 있습니다.

- 내부 검색 기반 `topic brief` 동작
- Playwright 기반 공식 사이트 스캔 동작
- snapshot 저장 + diff 기반 변화 감지 동작
- `가격`, `메시지`, `채용`, `제휴` 구조화 추출 동작
- 뉴스 근거와 사이트 근거를 묶는 `correlated event` 모델 도입
- `signal -> action -> vault -> action board` 루프 연결
- `/company`, `/customers`, `/poc`, `/finance`, `/evaluation` 얇은 화면을 실제 운영 화면으로 전환

즉, 지금은 `데모 UI`를 넘어서 `검색 -> 변화 감지 -> 이벤트 -> 액션` 기본 루프가 돌아가는 상태입니다.

---

## 2. 지금 실제로 되는 기능

### A. Topic Brief

- `/brief`
- `/api/analyze`

동작:

- 주제 기준 뉴스 수집
- 노이즈 기사 제거
- 5개 CEO 렌즈로 분류
  - infrastructure
  - adoption
  - competition
  - regulation
  - talent
- 요약, 인사이트, 액션 생성

핵심 파일:

- `lib/search/radar-search.ts`
- `lib/analysis/topic-brief.ts`
- `app/api/analyze/route.ts`
- `app/brief/page.tsx`

### B. Official Site Radar

- `/signals`
- `/api/agentic/radar`
- `/api/agentic/scan`

동작:

- tracked source registry 생성
- Playwright로 공식 사이트 탐색
- 이전 snapshot과 현재 snapshot 비교
- 변화가 있을 때 signal 생성
- structured change 추출

핵심 파일:

- `lib/agentic/source-registry.ts`
- `lib/agentic/scan.ts`
- `lib/agentic/radar.ts`
- `lib/agentic/snapshot-store.ts`
- `app/signals/page.tsx`

### C. Correlated Event Layer

동작:

- 공식 사이트 diff 결과를 `ExtractedFact[]`로 변환
- 뉴스 제목/요약에서 최소 fact 추출
- 같은 회사, 유사한 change type, 시간대, 텍스트 유사도로 `CorrelatedEvent[]` 생성
- deterministic ranking 적용

핵심 파일:

- `lib/app/intelligence.ts`

### D. Action Loop

동작:

- brief action 저장
- signal/event 기반 action 생성
- vault에 action metadata 저장
- `/finance`에서 `todo / doing / done` 관리

핵심 파일:

- `lib/app/actions.ts`
- `lib/app/vault.ts`
- `app/brief/page.tsx`
- `app/signals/page.tsx`
- `app/finance/page.tsx`
- `app/vault/page.tsx`

### E. 운영 화면

- `/company`: source registry 관리
- `/customers`: 경쟁사 타임라인
- `/poc`: run / diff 리뷰
- `/finance`: personal action board
- `/evaluation`: coverage / diagnostics

---

## 3. 최근 검증 기준

최근 기준으로 확인한 범위:

- `npm run build` 통과
- `/api/agentic/radar` 정상 응답
- `/api/analyze` 정상 응답
- `/api/agentic/control-room` 정상 응답
- `/api/agentic/run` 정상 응답
- 브라우저에서 다음 화면 확인
  - `/signals`
  - `/finance`
  - `/vault`
  - `/company`
  - `/evaluation`

검증 포인트:

- correlated event 렌더
- action 저장
- action board 반영
- vault action metadata 반영
- source registry 렌더
- diagnostics 카드 렌더

---

## 4. 현재 운영 원칙

- DB는 아직 쓰지 않음
- auth는 데모 세션 유지
- 저장은 `localStorage + .ceorader/agentic`
- 유료 외부 검색 API 의존 없음
- Ollama는 선택적 보조
- deterministic path가 항상 우선

즉, 지금 제품은 `가볍게 실행 가능하고`, `로컬에서 빠르게 실험 가능하고`, `AI 기능은 내부 엔진 중심`입니다.

---

## 5. 저장 구조

### 브라우저 로컬 상태

주요 키:

- `onboardingData`
- `ceorader_agentic_radar`
- `ceorader_analysis`
- `ceorader_analysis_history`
- `ceorader_vault`
- `ceorader_actions`

### 파일 기반 상태

repo 루트 기준:

- `.ceorader/agentic`

이 안에 저장되는 것:

- source registries
- scan runs
- latest snapshots
- snapshot history

주의:

- 브라우저 localStorage는 컴퓨터를 바꾸면 자동으로 안 옮겨집니다
- `.ceorader/agentic`는 git에 안 들어갈 수 있으니 별도 복사해야 합니다

자세한 건 [COMPUTER_SWITCH.md](/Users/wh.choi/Desktop/Code/CeoRader/COMPUTER_SWITCH.md)를 보면 됩니다.

---

## 6. 빠른 실행

### 1. 설치

```bash
npm install
```

### 2. Playwright 브라우저 설치

```bash
npx playwright install chromium
```

### 3. 개발 서버

```bash
npm run dev
```

### 4. 빌드 확인

```bash
npm run build
```

### 5. 선택 사항: Ollama 보조

메인 엔진은 Ollama 없이도 동작합니다.

```bash
brew install ollama
ollama serve
ollama pull llama3.1:latest
```

---

## 7. 주요 스크립트

```bash
npm run dev
npm run build
npm run start
npm run verify:ai
npm run verify:ai:e2e
npm run verify:pricing
```

---

## 8. 폴더 기준 핵심 맵

### 앱 화면

- `app/brief/page.tsx`
- `app/signals/page.tsx`
- `app/company/page.tsx`
- `app/customers/page.tsx`
- `app/poc/page.tsx`
- `app/finance/page.tsx`
- `app/evaluation/page.tsx`
- `app/vault/page.tsx`

### 엔진

- `lib/search/radar-search.ts`
- `lib/analysis/topic-brief.ts`
- `lib/app/intelligence.ts`
- `lib/app/actions.ts`
- `lib/agentic/source-registry.ts`
- `lib/agentic/scan.ts`
- `lib/agentic/radar.ts`
- `lib/agentic/snapshot-store.ts`

### API

- `app/api/analyze/route.ts`
- `app/api/agentic/radar/route.ts`
- `app/api/agentic/scan/route.ts`
- `app/api/agentic/run/route.ts`
- `app/api/agentic/control-room/route.ts`
- `app/api/agentic/sources/route.ts`

---

## 9. 다음에 해야 하는 것

지금부터의 우선순위는 `인프라`가 아니라 `신호 품질`입니다.

### 1순위

- extractor 정교화
- ranking / dedupe
- 뉴스와 공식 사이트 변화 correlation 개선
- competitor fallback 품질 개선

### 2순위

- `/customers` 타임라인 품질 강화
- `/poc` diff drill-down 더 강화
- `/evaluation` diagnostics 액션성 강화
- `/brief`와 `/signals` 액션 추천 품질 개선

### 3순위

- DB 도입
- 실제 auth
- team/workspace
- scheduler / alert

자세한 작업 목록은 [NEXT_STEPS.md](/Users/wh.choi/Desktop/Code/CeoRader/NEXT_STEPS.md), [TODO.md](/Users/wh.choi/Desktop/Code/CeoRader/TODO.md) 에 있습니다.

---

## 10. 컴퓨터를 바꿀 때 꼭 볼 문서

- [COMPUTER_SWITCH.md](/Users/wh.choi/Desktop/Code/CeoRader/COMPUTER_SWITCH.md)

이 문서에는:

- 무엇을 복사해야 하는지
- 무엇은 다시 입력해야 하는지
- 새 컴퓨터에서 어떤 순서로 실행해야 하는지
- 상태를 얼마나 보존할 수 있는지

가 정리되어 있습니다.
