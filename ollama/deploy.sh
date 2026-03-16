#!/bin/bash

# CeoRader Ollama 서버 배포 스크립트
# GPU 서버에서 실행

set -e

echo "🚀 CeoRader Ollama 서버 배포"
echo "============================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 필수 명령어 확인
echo "📋 필수 명령어 확인..."
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose가 설치되어 있지 않습니다.${NC}"; exit 1; }
command -v nvidia-smi >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  NVIDIA 드라이버가 감지되지 않았습니다.${NC}"; }

echo -e "${GREEN}✅ 필수 명령어 확인 완료${NC}"
echo ""

# 환경 변수 확인
if [ -z "$OLLAMA_HOST" ]; then
    export OLLAMA_HOST=http://localhost:11434
fi

# GPU 확인
echo "🎮 GPU 정보:"
nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader || echo "GPU 정보를 가져올 수 없습니다."
echo ""

# Docker Compose 실행
echo "🐳 Docker Compose 시작..."
cd ollama

# 기존 컨테이너 정리
echo "🧹 기존 컨테이너 정리..."
docker-compose down 2>/dev/null || true

# 새로운 컨테이너 시작
echo "🚀 새로운 컨테이너 시작..."
docker-compose up -d

echo ""
echo "⏳ Ollama 서버 시작 대기 (30초)..."
sleep 30

# 헬스체크
echo "🏥 헬스체크..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${GREEN}✅ Ollama 서버가 정상적으로 실행 중입니다.${NC}"
else
    echo -e "${RED}❌ Ollama 서버가 응답하지 않습니다.${NC}"
    echo "로그 확인: docker-compose logs ollama"
    exit 1
fi

echo ""
echo "📦 모델 다운로드..."
echo "모델 다운로드는 시간이 오래 걸릴 수 있습니다 (30-60분)."
echo "./download-models.sh 스크립트를 별도로 실행하세요."

echo ""
echo -e "${GREEN}✨ 배포 완료!${NC}"
echo ""
echo "📊 서비스 상태:"
docker-compose ps

echo ""
echo "🔗 접속 정보:"
echo "  - Ollama API: http://localhost:11434"
echo "  - Redis: localhost:6379"
echo ""
echo "📝 유용한 명령어:"
echo "  - 로그 확인: docker-compose logs -f ollama"
echo "  - 모델 목록: curl http://localhost:11434/api/tags"
echo "  - 서버 중지: docker-compose down"
echo ""
