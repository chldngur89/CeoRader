# CeoRader - 서비스 상용화 로드맵 (TODO)

> **현재 운영 원칙**: 당분간 DB 없이 `localStorage + .ceorader/agentic` 기반 메모리성 운영 유지
> **다음 작업 핸드오프**: 바로 이어서 볼 문서는 `NEXT_STEPS.md`

---

## 지금 유지할 방향
- [x] 인증은 데모 세션으로 유지
- [x] 브리프/신호/금고/레이더 캐시는 로컬 상태로 유지
- [x] 공식 사이트 스냅샷과 diff는 `.ceorader/agentic` 파일 저장으로 유지
- [x] Supabase는 placeholder 환경변수만 있을 경우 자동 비활성화

## DB 도입은 후속으로 미루는 항목
### 1. DB 구조 설계
- [ ] `profiles`
- [ ] `companies`
- [ ] `tracked_sources`
- [ ] `scan_runs`
- [ ] `snapshots`
- [ ] `signals`
- [ ] `topic_briefs`
- [ ] `vault_items`
- [ ] `actions`

### 2. DB 도입 시 같이 해야 하는 것
- [ ] 로컬 상태에서 DB로 마이그레이션 전략 정리
- [ ] 사용자별 데이터 소유권 모델 정의
- [ ] RLS 정책 설계
- [ ] action board용 상태 모델 정의 (`todo / doing / done`)

---

## 기능 우선 남은 과제
### 1. 신호 품질 고도화
- [ ] 공식 사이트 extractor 정교화
- [ ] 동일 사건 뉴스/사이트 변화 correlation
- [ ] 신호 중요도 랭킹 개선
- [ ] competitor fallback을 evidence 기반 deterministic path로 교체

### 2. 얇은 운영 화면 강화
- [ ] `/company`를 source registry 관리 화면으로 확장
- [ ] `/customers`를 경쟁사 타임라인 화면으로 확장
- [ ] `/poc`를 run 상세/snapshot before-after 화면으로 확장
- [ ] `/finance`를 실제 action board로 전환
- [ ] `/evaluation`을 문제 수정 중심 운영 화면으로 전환

### 3. 인증/운영 고도화
- [ ] 실제 Google OAuth 또는 magic link 도입
- [ ] 데모 로그인 제거
- [ ] 팀/워크스페이스 모델 도입 여부 결정

---

## 최근 완료 사항
- [x] 내부 topic brief 엔진 구축
- [x] 공식 사이트 Playwright 스캔 + snapshot/diff 저장
- [x] structured change 추출 (`가격`, `메시지`, `채용`, `제휴`)
- [x] `/brief`, `/signals`에 구조화 결과를 UI 훼손 없이 반영
- [x] 레거시 OpenAI 엔진 제거
- [x] 구형 Ollama 전용 분석 API 제거
- [x] 현재 구조 기준 README / roadmap 문서 정리
