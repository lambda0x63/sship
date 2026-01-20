# sship

Docker 및 SSH 기반의 경량형 CD(Continuous Deployment) 및 원격 서버 관리 도구.
복잡한 CI/CD 파이프라인 구축 없이, 웹 대시보드에서 클릭 한 번으로 원격 서버 배포 및 관리 수행.

## 시스템 개요 (System Overview)

### 핵심 기능 (Key Features)
**원격 배포 자동화 (Auto Deployment)**
- **SSH Protocol** 기반의 안전한 원격 명령 실행
- **Docker Compose** 연동을 통한 컨테이너 오케스트레이션 자동화
- **Git Integration** 최신 코드 풀(Pull) 및 버전 관리

**프로덕션 관리 도구 (Operations)**
- **Real-time Logs** WebSocket을 이용한 실시간 컨테이너 로그 스트리밍
- **Instant Rollback** 배포 실패 시 이전 커밋으로 즉시 복구(Rollback) 지원
- **Health Check** 배포 후 서비스 상태 자동 점검 기능

**멀티 프로젝트 관리 (Multi-Project)**
- YAML 설정 기반의 다중 프로젝트/서버 중앙 관리
- 웹 기반 대시보드(Web UI)를 통한 직관적 제어

## 기술 스택 (Tech Stack)

- **Language** Go 1.24
- **Web Framework** Gin (High-performance HTTP Web Framework)
- **Protocol** SSH (Crypto/SSH), WebSocket (Gorilla)
- **Container** Docker & Docker Compose
- **Architecture** Clean Architecture (Standard Go Layout)

## 설치 및 실행 (Installation)

### Docker 실행 (Recommended)
가장 간편한 실행 방법. 설정 파일(`sship.yaml`)을 마운트하여 컨테이너 구동.

```bash
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest
```

### 바이너리 실행 (Manual)
직접 실행 파일 다운로드 및 구동.

```bash
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-$(uname -s)-$(uname -m) -o sship
chmod +x sship
./sship
```

## 설정 가이드 (Configuration)

`sship.yaml` 파일을 통해 관리할 프로젝트 정의.

```yaml
projects:
  myapp:
    # SSH 원격 접속 정보
    server:
      host: example.com
      port: 22
      user: root
      password: ${SSH_PASSWORD} # 환경 변수 사용 권장
    
    # 배포 경로 및 설정
    path: /root/myapp
    branch: main
    docker_compose: docker-compose.prod.yml
    
    # 옵션
    health_check: http://localhost:8080/health
```

## 개발 및 빌드 (Development)

```bash
# 의존성 설치
go mod download

# 서버 실행 (Dev Mode)
go run ./cmd/web

# 프로덕션 빌드
go build -o sship ./cmd/web
```