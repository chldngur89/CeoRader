# CeoRader Computer Switch Guide

이 문서는 `새 컴퓨터로 옮길 때 무엇을 복사해야 하고`, `무엇은 다시 세팅해야 하는지`를 정리한 문서입니다.

기준 날짜: `2026-04-15`

---

## 1. 가장 중요한 요약

CeoRader는 지금 `두 종류의 상태`를 씁니다.

### A. 브라우저 로컬 상태

- `localStorage`
- 로그인 상태
- 온보딩 데이터
- brief 결과
- radar cache
- vault
- actions

이 상태는 `컴퓨터를 바꾸면 자동으로 안 옮겨집니다`.

### B. 파일 기반 상태

- `.ceorader/agentic`

이 안에는 다음이 들어 있습니다.

- tracked source registry
- scan runs
- snapshots
- snapshot history

이건 `repo와 함께 직접 복사하면 옮길 수 있습니다`.

---

## 2. 새 컴퓨터로 가져가야 하는 것

반드시 가져갈 것:

- 프로젝트 소스 전체
- `.env.local`
- `.ceorader/agentic`
- `package-lock.json`

가져갈 필요 없는 것:

- `.next`
- `node_modules`
- `.playwright-cli`
- `tsconfig.tsbuildinfo`

주의:

- `.ceorader`는 숨김 폴더라서 Finder/Explorer에서 놓치기 쉽습니다
- `git clone`만 하면 `.ceorader/agentic`는 안 따라올 수 있습니다

---

## 3. 새 컴퓨터에서 설치할 것

### 필수

- Node.js / npm
- 프로젝트 의존성
- Playwright Chromium

명령:

```bash
npm install
npx playwright install chromium
```

### 선택

- Ollama

메인 엔진은 Ollama 없이도 동작합니다.

로컬 모델 보조까지 쓰려면:

```bash
brew install ollama
ollama serve
ollama pull llama3.1:latest
```

---

## 4. 새 컴퓨터 첫 실행 순서

### 1. 프로젝트 복사

방법:

- `git clone` + 숨김 폴더 수동 복사
- 또는 프로젝트 폴더 전체를 통째로 복사

### 2. 환경 파일 복사

복사할 파일:

- `.env.local`

### 3. agentic 상태 복사

복사할 폴더:

- `.ceorader/agentic`

### 4. 의존성 설치

```bash
npm install
npx playwright install chromium
```

### 5. 빌드 확인

```bash
npm run build
```

### 6. 개발 서버 실행

```bash
npm run dev
```

### 7. 앱 접속

```text
http://localhost:3000
```

---

## 5. 무엇이 자동으로 유지되고, 무엇이 안 유지되는가

### 유지 가능

- `.ceorader/agentic` 안의 scan runs
- snapshots
- snapshot history
- source registries

### 유지 안 됨

- 브라우저 localStorage
- 데모 로그인 상태
- 온보딩 입력값
- vault/action/brief cache

즉:

- 파일 기반 radar 이력은 옮길 수 있음
- 브라우저 기반 사용자 상태는 다시 세팅해야 함

---

## 6. 새 컴퓨터에서 다시 입력해야 할 것

아래는 브라우저 localStorage에 있기 때문에 다시 입력해야 할 수 있습니다.

- 데모 로그인
- 회사 정보
- 추적 회사 목록
- 키워드 / 목표
- 저장한 vault 항목
- action board 상태

가장 안전한 기준:

- `온보딩은 다시 한다`
- `중요한 snapshot/run history만 .ceorader/agentic로 보존한다`

---

## 7. 새 컴퓨터에서 바로 확인할 체크리스트

### A. 기본 실행 확인

```bash
npm run build
```

기대 결과:

- build 성공

### B. 라우트 확인

직접 열어볼 화면:

- `/signals`
- `/brief`
- `/company`
- `/customers`
- `/poc`
- `/finance`
- `/evaluation`
- `/vault`

### C. API 확인

필수 확인:

- `/api/analyze`
- `/api/agentic/radar`
- `/api/agentic/control-room`
- `/api/agentic/run`

---

## 8. 지금 상태에서 추천 복구 방식

### 가장 쉬운 방식

1. repo 전체 복사
2. `.env.local` 복사
3. `.ceorader/agentic` 복사
4. `npm install`
5. `npx playwright install chromium`
6. `npm run build`
7. `npm run dev`
8. 브라우저에서 다시 로그인하고 온보딩 입력

이 방식이 가장 안정적입니다.

---

## 9. 복구 후 바로 해야 할 일

새 컴퓨터에서 실행이 되면 다음 순서로 다시 시작하면 됩니다.

### 1순위

- 실제 경쟁사 3~5개 다시 입력
- `/signals`에서 이벤트 확인
- `/finance`에서 action loop 확인

### 2순위

- 신호 품질 튜닝
- extractor 정교화
- correlation 개선
- ranking / dedupe 개선

자세한 건 [NEXT_STEPS.md](/Users/wh.choi/Desktop/Code/CeoRader/NEXT_STEPS.md) 참고.

---

## 10. 현재 한계

현재 앱은 아직 `export / import` 기능이 없습니다.

즉:

- 브라우저 상태를 파일로 빼서 옮기는 기능 없음
- 새 컴퓨터에서는 localStorage를 그대로 복원하기 어려움

나중에 정말 필요하면 다음 기능을 추가하면 됩니다.

- onboarding export/import
- vault export/import
- actions export/import
- localStorage backup JSON 기능

지금은 아직 여기까지는 안 들어가 있습니다.
