<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **Simple SSH deployment tool for Docker Compose projects**
  <br>
</div>

## What is sship?

sship pulls your code from GitHub and runs `docker compose up` on your VPS. That's it.

## Quick Start

### 1. Prerequisites on VPS

```bash
# SSH into your VPS
ssh root@your-vps.com

# Clone your project
git clone https://github.com/yourusername/your-project.git
cd your-project

# Create docker-compose.prod.yml
# Create .env.production if needed
```

### 2. Install sship

#### Option 1: Docker (Recommended)
```bash
# Run with Docker image
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest

# Or create docker-compose.yml
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

# Run
docker compose up -d
```

#### Option 2: Binary Download
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

# Run (default port: 9999)
./sship
```

#### Option 3: Homebrew (macOS)
```bash
# Install
brew tap lambda0x63/sship
brew install sship

# Run
sship
```

### 3. Add Service

1. Open http://localhost:9999
2. Click "새 서비스 추가" (Add Service)
3. Fill in:
   - Service name
   - VPS connection (host, port, user, password)
   - Project path (e.g., `/root/your-project`)
   - Docker Compose file (default: `docker-compose.prod.yml`)

### 4. Deploy

Click "🚀 배포하기" button. Done!

## Features

- 🚀 One-click deployment
- 📊 Real-time deployment logs
- 🔍 Service status monitoring
- 🔐 Environment variables viewer
- 🗑️ Easy service management

## How it Works

When you deploy:
1. SSH into your VPS
2. `git pull` latest code
3. `docker compose down` (safely)
4. `docker compose up -d --build`

## Build from Source

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship

# Local build
go build -o sship ./cmd/web

# Or build for multiple platforms
make build-all

# Build Docker image
docker build -t sship:local .
```

## Runtime Options

### Binary
```bash
# Custom port
./sship -port 8080

# Custom config file
./sship -config myconfig.yaml

# Show version
./sship -version
```

### Docker
```bash
# Custom port and config
docker run -d \
  --name sship \
  -p 8080:9999 \
  -v $(pwd)/myconfig.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest
```

## Updating

### Docker Update
```bash
# Pull latest image
docker pull ghcr.io/lambda0x63/sship:latest

# Stop and remove old container
docker stop sship && docker rm sship

# Run new version
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest
```

### Binary Update
```bash
# Download new version (backup old one)
mv sship sship.old
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o sship
chmod +x sship
```

## License

MIT