#!/bin/bash

# Ollama 모델 다운로드 스크립트
# GPU 서버에서 실행

echo "🚀 CeoRader Ollama 모델 다운로드"
echo "================================"

# Ollama 서버가 실행 중인지 확인
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "❌ Ollama 서버가 실행되지 않았습니다."
    echo "먼저 docker-compose up -d ollama 를 실행하세요."
    exit 1
fi

# 모델 목록
MODELS=(
    "llama3.1:8b"      # 백업/경량용
    "llama3.1:70b"     # 메인 모델 (전략 분석)
    "mistral:7b"       # 빠른 응답용
    "qwen2.5:14b"      # 한국어 특화
)

echo "📦 다운로드할 모델:"or model in "${MODELS[@]}"; do
    echo "  - $model"
done

echo ""
echo "⬇️ 모델 다운로드 시작..."
echo "(총 소요 시간: 30-60분, 모델 크기에 따라 다름)"
echo ""

for model in "${MODELS[@]}"; do
    echo "📥 다운로드 중: $model"
    docker exec ceorader-ollama ollama pull $model
    
    if [ $? -eq 0 ]; then
        echo "✅ $model 다운로드 완료"
    else
        echo "❌ $model 다운로드 실패"
    fi
    echo ""
done

echo "================================"
echo "✨ 모든 모델 다운로드 완료!"
echo ""
echo "📋 설치된 모델 목록:"
docker exec ceorader-ollama ollama list
