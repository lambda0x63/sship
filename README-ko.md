<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **간소화된 셀프호스팅 인프라 플랫폼**
  <br>
</div>

## 개요

Docker 기반 배포를 위한 경량 CI/CD 오케스트레이션 도구. SSH 기반 원격 실행을 통해 원클릭으로 VPS에 애플리케이션 배포.

## 핵심 아키텍처

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Trigger   │────▶│ Git Pull &   │────▶│   Docker    │────▶│   Health     │
│  (Manual/   │     │ Branch Check │     │  Compose    │     │   Check &    │
│   Webhook)  │     │              │     │   Deploy    │     │  Monitoring  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

## 주요 기능

- **SSH 기반 배포**: 에이전트 없는 보안 원격 실행
- **실시간 모니터링**: WebSocket 기반 라이브 로그 스트리밍
- **다중 프로젝트 지원**: 하나의 대시보드에서 여러 배포 관리
- **자동 롤백**: 배포 히스토리가 있는 Git 기반 롤백
- **무중단 배포**: Docker Compose 오케스트레이션

## 빠른 시작

### 1. sship 설치

```bash
# Docker (권장)
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest

# 또는 바이너리 다운로드
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-$(uname -s)-$(uname -m) -o sship
chmod +x sship
./sship
```

### 2. 프로젝트 추가

http://localhost:9999 접속 후 설정:
- SSH 연결 정보
- 서버의 프로젝트 경로
- Docker Compose 파일 위치

### 3. 배포

배포 버튼 클릭. sship이 수행하는 작업:
1. 서버에 SSH 접속
2. 최신 코드 풀
3. `docker compose up -d --build` 실행

## 구성

```yaml
projects:
  myapp:
    server:
      host: example.com
      port: 22
      user: root
      password: ${SSH_PASSWORD}
    path: /root/myapp
    branch: main
    docker_compose: docker-compose.prod.yml
```

## 소스에서 빌드

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship
go build -o sship ./cmd/web
```

## 라이선스

MIT