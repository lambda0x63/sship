<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **Streamlined Self-Hosted Infrastructure Platform**
  <br>
</div>

## Overview

A lightweight CI/CD orchestration tool designed for efficient Docker-based deployment workflows. Built with a focus on simplicity, reliability, and real-time monitoring capabilities for self-hosted environments.

## Core Architecture

### Deployment Pipeline

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

## Key Features

### Infrastructure Management
- **SSH-based Remote Execution**: Secure command execution with configurable connection pooling
- **Multi-Project Support**: Centralized management for multiple deployment targets
- **Environment Isolation**: Project-specific configuration with environment variable management

### Deployment Capabilities
- **Zero-Downtime Deployment**: Docker Compose-based blue-green deployment strategy
- **Automated Rollback**: Git-based rollback mechanism with deployment history tracking
- **Health Check Integration**: Configurable health monitoring with automatic failure detection

### Monitoring & Observability
- **Real-time Log Streaming**: WebSocket-based live log aggregation
- **Deployment Event Tracking**: Comprehensive audit trail of all deployment activities
- **Service Status Dashboard**: At-a-glance view of all managed services

## Technical Implementation

### Core Components

1. **Deployment Engine** (`internal/deploy/`)
   - Orchestrates the complete deployment lifecycle
   - Manages SSH connections and remote command execution
   - Implements retry logic and failure recovery

2. **Configuration Management** (`internal/config/`)
   - YAML-based declarative configuration
   - Runtime configuration validation
   - Secure credential management

3. **API Layer** (`internal/api/`)
   - RESTful API for deployment operations
   - WebSocket endpoints for real-time updates
   - JWT-based authentication (optional)

4. **Web Interface** (`cmd/web/`)
   - Responsive dashboard for deployment management
   - Real-time deployment progress visualization
   - Interactive log viewer with filtering capabilities

## Deployment Flow

### Standard Deployment Process

1. **Pre-deployment Validation**
   - Configuration syntax verification
   - SSH connectivity check
   - Target directory existence validation

2. **Source Code Synchronization**
   - Git repository pull with branch verification
   - Conflict detection and resolution strategy
   - Submodule update handling

3. **Container Orchestration**
   - Docker image building (if required)
   - Service dependency resolution
   - Rolling update execution

4. **Post-deployment Operations**
   - Health check execution
   - Service availability verification
   - Notification dispatch

## Quick Start

### Prerequisites on Target Server

```bash
# SSH into your VPS
ssh root@your-server.com

# Clone your project
git clone https://github.com/yourusername/your-project.git
cd your-project

# Prepare Docker Compose configuration
# Create docker-compose.prod.yml
# Create .env.production if needed
```

### Installation

#### Docker (Recommended)

```bash
docker run -d \
  --name sship \
  -p 9999:9999 \
  -v $(pwd)/sship.yaml:/app/sship.yaml \
  ghcr.io/lambda0x63/sship:latest
```

#### Binary Installation

```bash
# Linux (amd64)
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-linux-amd64 -o sship
chmod +x sship

# macOS (Apple Silicon)
curl -L https://github.com/lambda0x63/sship/releases/latest/download/sship-darwin-arm64 -o sship
chmod +x sship

# Run
./sship -port 9999
```

## Configuration

### Project Configuration Structure

```yaml
projects:
  production-app:
    server:
      host: production.example.com
      port: 22
      user: deploy
      password: ${SSH_PASSWORD}  # Environment variable support
    path: /opt/applications/app
    branch: main
    docker_compose: docker-compose.prod.yml
    health_check: "curl -f http://localhost:3000/health || exit 1"
    env_file: .env.production
```

## Advanced Features

### Deployment Strategies

- **Blue-Green Deployment**: Minimizes downtime through parallel environment switching
- **Canary Releases**: Gradual rollout with configurable traffic splitting (roadmap)
- **Feature Flags**: Runtime feature toggling without redeployment (roadmap)

### Security Considerations

- **Credential Management**: Secure storage of SSH credentials
- **Audit Logging**: Comprehensive activity logging
- **Network Isolation**: SSH tunnel support for secure communication

## Build from Source

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship

# Build binary
go build -o sship ./cmd/web

# Build Docker image
docker build -t sship:local .

# Cross-platform builds
make build-all
```

## License

MIT License - see [LICENSE](LICENSE) for details.