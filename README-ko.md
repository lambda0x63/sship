<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **간소화된 셀프호스팅 인프라 플랫폼**
  <br>
</div>

## 개요

효율적인 Docker 기반 배포 워크플로우를 위한 경량 CI/CD 오케스트레이션 도구. 셀프호스팅 환경에서의 단순성, 신뢰성, 실시간 모니터링 기능에 중점을 두고 설계된 플랫폼.

## 핵심 아키텍처

### 배포 파이프라인

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Trigger   │────▶│ Git Pull &   │────▶│   Docker    │────▶│   Health     │
│  (Manual/   │     │ Branch Check │     │  Compose    │     │   Check &    │
│   Webhook)  │     │              │     │   Deploy    │     │  Monitoring  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                           │                      │                     │
                           ▼                      ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
                    │   Rollback   │     │   Service   │     │  Real-time   │
                    │  Capability  │     │   Status    │     │   Logging    │
                    └──────────────┘     └─────────────┘     └──────────────┘
```

## 주요 기능

### 인프라 관리
- **SSH 기반 원격 실행**: 구성 가능한 연결 풀링을 통한 보안 명령 실행
- **다중 프로젝트 지원**: 여러 배포 대상의 중앙 집중식 관리
- **환경 격리**: 환경 변수 관리를 통한 프로젝트별 구성

### 배포 기능
- **무중단 배포**: Docker Compose 기반 블루-그린 배포 전략
- **자동 롤백**: 배포 히스토리 추적을 통한 Git 기반 롤백 메커니즘
- **헬스체크 통합**: 자동 실패 감지를 통한 구성 가능한 상태 모니터링

### 모니터링 및 관찰성
- **실시간 로그 스트리밍**: WebSocket 기반 라이브 로그 집계
- **배포 이벤트 추적**: 모든 배포 활동의 포괄적인 감사 추적
- **서비스 상태 대시보드**: 관리되는 모든 서비스의 한눈에 보는 뷰

## 기술 구현

### 핵심 컴포넌트

1. **배포 엔진** (`internal/deploy/`)
   - 완전한 배포 라이프사이클 오케스트레이션
   - SSH 연결 및 원격 명령 실행 관리
   - 재시도 로직 및 실패 복구 구현

2. **구성 관리** (`internal/config/`)
   - YAML 기반 선언적 구성
   - 런타임 구성 검증
   - 보안 자격 증명 관리

3. **API 레이어** (`internal/api/`)
   - 배포 작업을 위한 RESTful API
   - 실시간 업데이트를 위한 WebSocket 엔드포인트
   - JWT 기반 인증 (선택사항)

4. **웹 인터페이스** (`cmd/web/`)
   - 배포 관리를 위한 반응형 대시보드
   - 실시간 배포 진행 상황 시각화
   - 필터링 기능이 있는 대화형 로그 뷰어

## 배포 플로우

### 표준 배포 프로세스

1. **배포 전 검증**
   - 구성 구문 확인
   - SSH 연결성 확인
   - 대상 디렉토리 존재 검증

2. **소스 코드 동기화**
   - 브랜치 확인을 통한 Git 저장소 풀
   - 충돌 감지 및 해결 전략
   - 서브모듈 업데이트 처리

3. **컨테이너 오케스트레이션**
   - Docker 이미지 빌드 (필요시)
   - 서비스 종속성 해결
   - 롤링 업데이트 실행

4. **배포 후 작업**
   - 헬스체크 실행
   - 서비스 가용성 확인
   - 알림 발송

## 빠른 시작

### 대상 서버 사전 준비

```bash
# VPS에 SSH 접속
ssh root@your-server.com

# 프로젝트 클론
git clone https://github.com/yourusername/your-project.git
cd your-project

# Docker Compose 구성 준비
# docker-compose.prod.yml 생성
# 필요시 .env.production 생성
```

### 설치

#### Docker (권장)

```bash
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest
```

#### 바이너리 설치

```bash
# Linux (amd64)
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-linux-amd64 -o sship
chmod +x sship

# macOS (Apple Silicon)
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-darwin-arm64 -o sship
chmod +x sship

# 실행
./sship -port 9999
```

## 구성

### 프로젝트 구성 구조

```yaml
projects:
  production-app:
    server:
      host: production.example.com
      port: 22
      user: deploy
      password: ${SSH_PASSWORD}  # 환경 변수 지원
    path: /opt/applications/app
    branch: main
    docker_compose: docker-compose.prod.yml
    health_check: "curl -f http://localhost:3000/health || exit 1"
    env_file: .env.production
```

## 고급 기능

### 배포 전략

- **블루-그린 배포**: 병렬 환경 전환을 통한 다운타임 최소화
- **카나리 릴리스**: 구성 가능한 트래픽 분할을 통한 점진적 롤아웃 (로드맵)
- **기능 플래그**: 재배포 없는 런타임 기능 토글 (로드맵)

### 보안 고려사항

- **자격 증명 관리**: SSH 자격 증명의 안전한 저장
- **감사 로깅**: 포괄적인 활동 로깅
- **네트워크 격리**: 보안 통신을 위한 SSH 터널 지원

## 소스에서 빌드

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship

# 바이너리 빌드
go build -o sship ./cmd/web

# Docker 이미지 빌드
docker build -t sship:local .

# 크로스 플랫폼 빌드
make build-all
```

## 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](LICENSE) 참조.