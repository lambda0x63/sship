<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **Streamlined Self-Hosted Infrastructure Platform**
  <br>
</div>

## Overview

A lightweight CI/CD orchestration tool for Docker-based deployments. Deploy your applications to any VPS with a single click through SSH-based remote execution.

## Core Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Trigger   │────▶│ Git Pull &   │────▶│   Docker    │────▶│   Health     │
│  (Manual/   │     │ Branch Check │     │  Compose    │     │   Check &    │
│   Webhook)  │     │              │     │   Deploy    │     │  Monitoring  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

## Key Features

- **SSH-based Deployment**: Secure remote execution without agents
- **Real-time Monitoring**: WebSocket-based live log streaming
- **Multi-Project Support**: Manage multiple deployments from one dashboard
- **Automated Rollback**: Git-based rollback with deployment history
- **Zero-Downtime Deployment**: Docker Compose orchestration

## Quick Start

### 1. Install sship

```bash
# Docker (Recommended)
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest

# Or download binary
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-$(uname -s)-$(uname -m) -o sship
chmod +x sship
./sship
```

### 2. Add Your Project

Open http://localhost:9999 and configure:
- SSH connection details
- Project path on server
- Docker Compose file location

### 3. Deploy

Click the deploy button. sship will:
1. SSH into your server
2. Pull latest code
3. Run `docker compose up -d --build`

## Configuration

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

## Build from Source

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship
go build -o sship ./cmd/web
```

## License

MIT