# CeoRader Next Steps

> 다음 작업자가 바로 이어서 볼 기준 문서입니다.
> 제품 기준 설명은 `README.md`, 전략은 `AGENTIC_SEARCH_ROADMAP.md`, 실행 체크리스트는 이 문서를 우선합니다.

## 1. 지금 진짜 되는 기능

- `/brief`
  - 내부 topic brief 엔진으로 `AI` 같은 주제를 CEO 브리프로 생성
  - 뉴스 검색, 노이즈 제거, 5개 렌즈 분류, 액션 제안
- `/signals`
  - Playwright 기반 공식 사이트 스캔
  - snapshot/diff 비교
  - `가격`, `메시지`, `채용`, `제휴` 구조화 변화 표시
- `/vault`
  - 브리프 저장
  - 신호 저장
- 저장 계층
  - `localStorage + .ceorader/agentic`
  - DB 없이 동작

## 2. 실제 검증 완료

- Playwright로 `/login`, `/brief`, `/signals`, `/vault` 화면 확인
- `AI` 브리프 생성 확인
- `Agentic Scan` 결과 렌더 확인
- `initial signal` 생성 시 금고 저장 확인
- 스크린샷:
  - `.ceorader/verification/01-login.png`
  - `.ceorader/verification/02-brief.png`
  - `.ceorader/verification/03-signals.png`
  - `.ceorader/verification/04-vault.png`
  - `.ceorader/verification/05-vault-verified.png`

## 3. 지금 해야 하는 것

### 1순위: 신호 품질

- [ ] source type별 extractor 정교화
- [ ] 뉴스와 공식 사이트 변화 correlation
- [ ] ranking / dedupe 개선
- [ ] competitor fallback을 evidence 중심 deterministic path로 교체

### 2순위: 얇은 화면을 실제 워크플로우로 전환

- [ ] `/company` -> source registry 관리 화면
- [ ] `/customers` -> 경쟁사 타임라인
- [ ] `/poc` -> run / diff 리뷰
- [ ] `/finance` -> action board
- [ ] `/evaluation` -> coverage / error diagnostics

### 3순위: 액션 루프

- [ ] brief / signals에서 `action` 객체 생성
- [ ] vault -> action board 연결
- [ ] owner / horizon / priority를 일관된 모델로 정리

## 4. 남겨야 하는 것

### 지금은 유지

- [ ] 데모 세션 인증 유지
- [ ] 로컬 저장 유지
- [ ] optional Ollama 보조 유지
- [ ] DB 미도입 유지

### 나중으로 미룸

- [ ] 실제 auth
- [ ] DB schema
- [ ] workspace / team model
- [ ] scheduler / alert
- [ ] migration / RLS

## 5. 하지 말아야 하는 것

- [ ] 외부 유료 검색 API 의존으로 되돌리기
- [ ] 품질 고도화 전에 DB/auth부터 붙이기
- [ ] Python 별도 시스템으로 분리하기
- [ ] thin page를 UI만 바꾸고 엔진 연결 없이 늘리기

## 6. 다음 작업 시작점

- 검색 / 브리프 품질: `lib/search/radar-search.ts`, `lib/analysis/topic-brief.ts`
- 공식 사이트 변화: `lib/agentic/radar.ts`, `lib/agentic/scan.ts`, `lib/agentic/snapshot-store.ts`
- 신호 화면: `app/signals/page.tsx`
- 브리프 화면: `app/brief/page.tsx`
- 저장 타입: `lib/app/vault.ts`, `lib/app/topic-brief.ts`

## 7. 한 줄 원칙

먼저 `더 정확한 신호`를 만들고, 그 다음 `더 좋은 워크플로우`를 만들고, DB/auth는 마지막에 붙입니다.
