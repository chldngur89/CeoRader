# 로컬 Ollama MVP 개발

> 이 문서는 초기 MVP 실험용입니다. 현재 메인 브리프 엔진은 Ollama 없이도 동작하며, 최신 기준은 `README.md`를 보세요.

## 사전 준비 (1분)

```bash
# 1. Ollama 설치 (이미 되어 있으면 스킵)
brew install ollama  # Mac
# 또는 https://ollama.ai/download

# 2. Ollama 서버 실행
ollama serve

# 3. 모델 다운로드 (새 터미널에서)
ollama pull llama3.1:8b
# 또는 더 가벼운 모델: ollama pull mistral:7b
```

## 테스트

```bash
# Ollama가 실행 중인지 확인
curl http://localhost:11434/api/tags
```

## MVP 구성

1. `/api/analyze` - Ollama 직접 호출
2. 대시보드 - 실제 분석 결과 표시
3. 로딩 상태 - 분석 중 표시

## 시작!

```bash
npm run dev
# http://localhost:3000 접속
```
