# sship Makefile

.PHONY: build build-all build-windows build-mac build-linux prepare-windows-resources run dev clean help docker docker-build docker-run docker-push

# Default build for current platform
build:
	@echo "🔨 Building sship Web Server for current platform..."
	go build -ldflags="-s -w" -o sship-web cmd/web/*.go
	@echo "✅ Web server build complete: ./sship-web"

# Build for all platforms
build-all: build-windows build-mac build-linux
	@echo "✅ All platform builds complete!"

# Windows build (exe with icon)
build-windows: prepare-windows-resources
	@echo "🪟 Building for Windows..."
	@# Build for Windows amd64 with version info
	@if [ -f resource_windows_amd64.syso ]; then \
		echo "Building Windows amd64 with icon..."; \
		GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o dist/sship-windows-amd64.exe cmd/web/*.go; \
		rm -f resource_windows_amd64.syso; \
	else \
		GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o dist/sship-windows-amd64.exe cmd/web/*.go; \
	fi
	@# Build for Windows arm64
	GOOS=windows GOARCH=arm64 go build -ldflags="-s -w" -o dist/sship-windows-arm64.exe cmd/web/*.go
	@echo "✅ Windows builds complete"

# Prepare Windows resources (icon and version info)
prepare-windows-resources:
	@echo "📦 Preparing Windows resources..."
	@# Check if icon.png exists
	@if [ ! -f assets/icon.png ]; then \
		echo "⚠️  Warning: assets/icon.png not found. Skipping icon embedding."; \
	else \
		if [ ! -f assets/icon.ico ] && command -v convert >/dev/null 2>&1; then \
			echo "Converting PNG to ICO..."; \
			sh scripts/convert_icon.sh || echo "Warning: Icon conversion failed, continuing without icon"; \
		elif [ ! -f assets/icon.ico ]; then \
			echo "⚠️  Warning: ImageMagick not found. Skipping icon conversion."; \
		fi \
	fi
	@# Generate Windows resource file
	@if command -v goversioninfo >/dev/null 2>&1 || [ -f ~/go/bin/goversioninfo ]; then \
		echo "Generating Windows resource file..."; \
		if command -v goversioninfo >/dev/null 2>&1; then \
			goversioninfo -64 -o resource_windows_amd64.syso versioninfo.json || echo "Warning: Failed to generate resource file"; \
		else \
			~/go/bin/goversioninfo -64 -o resource_windows_amd64.syso versioninfo.json || echo "Warning: Failed to generate resource file"; \
		fi \
	else \
		echo "⚠️  goversioninfo not found. Install with: go install github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest"; \
	fi

# macOS build
build-mac:
	@echo "🍎 Building for macOS..."
	GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o dist/sship-darwin-amd64 cmd/web/*.go
	GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o dist/sship-darwin-arm64 cmd/web/*.go
	@echo "✅ macOS builds complete"

# Linux build
build-linux:
	@echo "🐧 Building for Linux..."
	GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o dist/sship-linux-amd64 cmd/web/*.go
	GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o dist/sship-linux-arm64 cmd/web/*.go
	@echo "✅ Linux builds complete"

run: build
	@echo "🚀 Starting sship Web Server..."
	./sship-web

dev:
	@echo "🔄 Starting sship Web Server in development mode..."
	go run cmd/web/*.go

clean:
	@echo "🧹 Cleaning up..."
	rm -f sship sship-web
	rm -rf dist/
	rm -f *.syso
	rm -f resource.syso
	@echo "✅ Clean complete"

# Docker commands
docker: docker-build
	@echo "✅ Docker image ready"

docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t sship:latest .

docker-run:
	@echo "🚀 Running sship in Docker..."
	docker run -d \
		--name sship \
		-p 8080:8080 \
		-v $(PWD)/sship.yaml:/app/config/sship.yaml \
		sship:latest

docker-push:
	@echo "📤 Pushing to Docker Hub..."
	@if [ -z "$(DOCKER_USERNAME)" ]; then \
		echo "Error: DOCKER_USERNAME not set"; \
		exit 1; \
	fi
	docker tag sship:latest $(DOCKER_USERNAME)/sship:latest
	docker push $(DOCKER_USERNAME)/sship:latest

help:
	@echo "sship Web Interface - Makefile commands:"
	@echo "  make build        - Build for current platform"
	@echo "  make build-all    - Build for all platforms (Windows, macOS, Linux)"
	@echo "  make build-windows - Build for Windows (amd64, arm64)"
	@echo "  make build-mac    - Build for macOS (amd64, arm64)"
	@echo "  make build-linux  - Build for Linux (amd64, arm64)"
	@echo "  make run          - Build and run web server"
	@echo "  make dev          - Run in development mode"
	@echo "  make clean        - Remove built binaries"
	@echo ""
	@echo "Docker commands:"
	@echo "  make docker       - Build Docker image"
	@echo "  make docker-run   - Run sship in Docker"
	@echo "  make docker-push  - Push to Docker Hub (set DOCKER_USERNAME env var)"
	@echo ""
	@echo "  make help         - Show this help message"