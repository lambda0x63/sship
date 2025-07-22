<div align="center">

[English](README.md) | [한국어](README-ko.md)

  <img width="256" height="256" alt="Image" src="https://github.com/user-attachments/assets/a7d5ec9f-b2b5-4647-b6fe-d66c088ece6e" />
  
  # sship
  
  **SSH-based Docker Compose deployment tool with Web UI**
  <br>
</div>

## Installation

### Option 1: Docker (Recommended)

```bash
# Using Docker Hub
docker run -d \
  --name sship \
  -p 8080:8080 \
  -v ./sship.yaml:/app/config/sship.yaml \
  lambda0x63/sship:latest

# Or using Docker Compose
curl -O https://raw.githubusercontent.com/lambda0x63/sship/main/docker-compose.yml
docker-compose up -d
```

### Option 2: Homebrew (macOS/Linux)

```bash
# Add tap (one time only)
brew tap lambda0x63/tap

# Install
brew install sship

# Run
sship
```

### Option 3: Download Pre-built Binary

Download the latest release from [GitHub Releases](https://github.com/lambda0x63/sship/releases/latest).

**Windows:**
1. Download `sship-windows-amd64.zip`
2. Extract the zip file
3. Run `sship-windows-amd64.exe`

**macOS (without Homebrew):**
```bash
# Download and extract
tar -xzf sship-darwin-arm64.tar.gz

# Remove quarantine attribute (macOS security)
xattr -d com.apple.quarantine sship-darwin-arm64

# Make executable and run
chmod +x sship-darwin-arm64
./sship-darwin-arm64
```

**Linux:**
```bash
# Download and extract
tar -xzf sship-linux-amd64.tar.gz

# Make executable and run
chmod +x sship-linux-amd64
./sship-linux-amd64
```

### Option 4: Build from Source

```bash
git clone https://github.com/lambda0x63/sship.git
cd sship
make build  # Build for current platform
# or
make build-all  # Build for all platforms
```

## Quick Start

1. **Start sship:**
```bash
make run
# Open http://localhost:8080 in your browser
```

2. **Initial Setup:**
   - On first run, you'll see a setup wizard
   - Enter your first project details
   - Test the SSH connection
   - Click "Setup Complete" to start

3. **Add More Projects:**
   - Click "➕ Add Project" button on dashboard
   - Fill in server and project details
   - All settings are saved automatically

## Usage

```bash
# Start web server
make run

# Access the dashboard
http://localhost:8080
```

## Features

- 🎯 **Easy Setup Wizard** - Get started in minutes with guided setup
- 🌐 **Multi-VPS Support** - Manage projects across multiple servers
- 🚀 **One-click Deployment** - Deploy with a single button click
- 📊 **Real-time Dashboard** - Monitor all your projects in one place
- 📜 **Live Log Streaming** - Watch deployment progress in real-time
- 🔄 **Easy Rollback** - Quickly revert to previous version
- ✅ **Pre-deployment Validation** - Checks before deployment
- 📱 **Responsive Design** - Works on desktop and mobile
- ➕ **Web-based Configuration** - Add/edit projects directly from UI

## How it Works

1. **Initial Setup** - Use the setup wizard or add projects via the dashboard
2. **Start the web interface** with `make run`
3. **Click deploy** on any project from the dashboard
4. **Watch live progress** as sship:
   - Connects to your VPS via SSH
   - Pulls latest code from Git
   - Builds and restarts Docker containers
   - Validates deployment health

## Requirements

**On your local machine:**
- Go 1.19+ (for building)
- Web browser

**On your VPS:**
- Docker & Docker Compose installed
- Git installed

## Initial VPS Setup

**First time setup for each project:**

```bash
# 1. SSH into your VPS
ssh root@your-vps.com

# 2. Clone your repository
cd /root
git clone https://github.com/yourusername/your-project.git

# 3. For private repositories, set up authentication:
# Option A: Using personal access token
git config --global credential.helper store
git pull  # Enter username and token when prompted

# Option B: Using SSH key
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub  # Add this to GitHub
git remote set-url origin git@github.com:yourusername/your-project.git

# 4. Create .env file if needed
cd your-project
cp .env.example .env.production
# Edit .env.production with your settings
```

After initial setup, sship will handle all deployments automatically!