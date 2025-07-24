<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **Docker Compose 프로젝트를 위한 간단한 SSH 배포 도구**
  <br>
</div>

## sship이란?

sship은 GitHub에서 코드를 pull하고 VPS에서 `docker compose up`을 실행합니다. 그게 전부입니다.

## 빠른 시작

### 1. VPS 사전 준비

```bash
# VPS에 SSH 접속
ssh root@your-vps.com

# 프로젝트 클론
git clone https://github.com/yourusername/your-project.git
cd your-project

# docker-compose.prod.yml 파일 생성
# 필요시 .env.production 파일 생성
```

### 2. sship 설치

#### 옵션 1: Docker로 실행 (권장)
```bash
# Docker 이미지로 바로 실행
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest

# 또는 docker-compose.yml 생성
cat > docker-compose.yml << EOF
version: '3.8'
services:
  sship:
    image: ghcr.io/lambda0x63/sship:latest
    container_name: sship
    ports:
      - "9999:9999"
    volumes:
      - ./sship.yaml:/app/sship.yaml
    restart: unless-stopped
EOF

# 실행
docker compose up -d
```

#### 옵션 2: 바이너리 다운로드
```bash
# Linux (amd64)
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-linux-amd64 -o sship
chmod +x sship

# macOS (Apple Silicon)
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-darwin-arm64 -o sship
chmod +x sship

# macOS (Intel)
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-darwin-amd64 -o sship
chmod +x sship

# 실행 (기본 포트: 9999)
./sship
```

#### 옵션 3: Homebrew (macOS)
```bash
# 설치
brew tap lambda0x63/sship
brew install sship

# 실행
sship
```

### 3. 서비스 추가

1. http://localhost:9999 접속
2. "새 서비스 추가" 클릭
3. 입력 사항:
   - 서비스 이름
   - VPS 연결 정보 (호스트, 포트, 사용자, 비밀번호)
   - 프로젝트 경로 (예: `/root/your-project`)
   - Docker Compose 파일 (기본값: `docker-compose.prod.yml`)

### 4. 배포

"🚀 배포하기" 버튼 클릭. 끝!

## 기능

- 🚀 원클릭 배포
- 📊 실시간 배포 로그
- 🔍 서비스 상태 모니터링
- 🔐 환경 변수 확인
- 🗑️ 간편한 서비스 관리

## 작동 방식

배포 시 수행 작업:
1. VPS에 SSH 연결
2. 최신 코드 `git pull`
3. `docker compose down` (안전하게)
4. `docker compose up -d --build`

## 소스에서 빌드

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship

# 로컬 빌드
go build -o sship ./cmd/web

# 또는 여러 플랫폼용 빌드
make build-all

# Docker 이미지 빌드
docker build -t sship:local .
```

## 실행 옵션

### 바이너리 실행 시
```bash
# 커스텀 포트
./sship -port 8080

# 커스텀 설정 파일
./sship -config myconfig.yaml

# 버전 확인
./sship -version
```

### Docker 실행 시
```bash
# 커스텀 포트와 설정
docker run -d \
  --name sship \
  -p 8080:9999 \
  -v $(pwd)/myconfig.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest
```

## 업데이트

### Docker 업데이트
```bash
# 최신 이미지 받기
docker pull ghcr.io/lambda0x63/sship:latest

# 기존 컨테이너 중지 및 삭제
docker stop sship && docker rm sship

# 새 버전으로 실행
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest
```

### 바이너리 업데이트
```bash
# 새 버전 다운로드 (기존 파일 백업)
mv sship sship.old
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o sship
chmod +x sship
```

## 라이선스

MIT