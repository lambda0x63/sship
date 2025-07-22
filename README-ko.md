<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **웹 UI를 제공하는 SSH 기반 Docker Compose 배포 도구**
  <br>
</div>

## 설치

### 방법 1: Docker (권장)

```bash
# Docker Hub 사용
docker run -d \
  --name sship \
  -p 8080:8080 \
  -v ./sship.yaml:/app/config/sship.yaml \
  lambda0x63/sship:latest

# 또는 Docker Compose 사용
curl -O https://raw.githubusercontent.com/lambda0x63/sship/main/docker-compose.yml
docker-compose up -d
```

### 방법 2: Homebrew (macOS/Linux)

```bash
# tap 추가 (최초 1회만)
brew tap lambda0x63/tap

# 설치
brew install sship

# 실행
sship
```

### 방법 3: 사전 빌드된 바이너리 다운로드

[GitHub Releases](https://github.com/lambda0x63/sship/releases/latest)에서 최신 버전을 다운로드하세요.

**Windows:**
1. `sship-windows-amd64.zip` 다운로드
2. 압축 파일 해제
3. `sship-windows-amd64.exe` 실행

**macOS (Homebrew 없이):**
```bash
# 다운로드 및 압축 해제
tar -xzf sship-darwin-arm64.tar.gz

# macOS 보안 속성 제거
xattr -d com.apple.quarantine sship-darwin-arm64

# 실행 권한 부여 및 실행
chmod +x sship-darwin-arm64
./sship-darwin-arm64
```

**Linux:**
```bash
# 다운로드 및 압축 해제
tar -xzf sship-linux-amd64.tar.gz

# 실행 권한 부여 및 실행
chmod +x sship-linux-amd64
./sship-linux-amd64
```

### 방법 4: 소스 코드에서 빌드

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship
make build  # 현재 플랫폼용 빌드
# 또는
make build-all  # 모든 플랫폼용 빌드
```

## 빠른 시작

1. **sship 실행:**
```bash
make run
# 브라우저에서 http://localhost:8080 접속
```

2. **초기 설정:**
   - 첫 실행 시 설정 마법사가 표시됩니다
   - 첫 번째 프로젝트 정보를 입력하세요
   - SSH 연결을 테스트하세요
   - "설정 완료" 버튼을 클릭하여 시작

3. **프로젝트 추가:**
   - 대시보드에서 "➕ 프로젝트 추가" 버튼 클릭
   - 서버 및 프로젝트 정보 입력
   - 모든 설정은 자동으로 저장됩니다

## 사용법

```bash
# 웹 서버 시작
make run

# 대시보드 접속
http://localhost:8080
```

## 기능

- 🎯 **간편한 설정 마법사** - 몇 분 만에 시작할 수 있는 가이드 설정
- 🌐 **다중 VPS 지원** - 여러 서버의 프로젝트를 한 곳에서 관리
- 🚀 **원클릭 배포** - 버튼 클릭 한 번으로 배포
- 📊 **실시간 대시보드** - 모든 프로젝트를 한눈에 모니터링
- 📜 **실시간 로그 스트리밍** - 배포 진행 상황을 실시간으로 확인
- 🔄 **간편한 롤백** - 이전 버전으로 빠르게 복원
- ✅ **배포 전 검증** - 배포 전 사전 체크
- 📱 **반응형 디자인** - 데스크톱과 모바일에서 모두 사용 가능
- ➕ **웹 기반 설정** - UI에서 직접 프로젝트 추가/편집

## 작동 방식

1. **초기 설정** - 설정 마법사를 사용하거나 대시보드에서 프로젝트 추가
2. **웹 인터페이스 시작** - `make run` 실행
3. **배포 클릭** - 대시보드에서 원하는 프로젝트의 배포 버튼 클릭
4. **실시간 진행 확인** - sship이 다음 작업을 수행:
   - SSH를 통해 VPS 연결
   - Git에서 최신 코드 pull
   - Docker 컨테이너 빌드 및 재시작
   - 배포 상태 검증

## 요구사항

**로컬 머신:**
- Go 1.19+ (빌드용)
- 웹 브라우저

**VPS:**
- Docker & Docker Compose 설치
- Git 설치

## VPS 초기 설정

**각 프로젝트별 최초 1회 설정:**

```bash
# 1. VPS에 SSH 접속
ssh root@your-vps.com

# 2. 저장소 클론
cd /root
git clone https://github.com/yourusername/your-project.git

# 3. 프라이빗 저장소의 경우 인증 설정:
# 방법 A: Personal Access Token 사용
git config --global credential.helper store
git pull  # 사용자명과 토큰 입력

# 방법 B: SSH 키 사용
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub  # 이 내용을 GitHub에 추가
git remote set-url origin git@github.com:yourusername/your-project.git

# 4. 필요시 .env 파일 생성
cd your-project
cp .env.example .env.production
# .env.production 파일 편집
```

초기 설정 후에는 sship이 모든 배포를 자동으로 처리합니다!