# sship Makefile

.PHONY: dev clean help docker docker-build docker-run docker-push

dev:
	@echo "🔄 Starting sship Web Server in development mode..."
	go run cmd/web/*.go

clean:
	@echo "🧹 Cleaning up..."
	rm -f sship sship-web
	rm -rf dist/
	rm -f *.syso
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
		-p 9999:9999 \
		-v $(PWD)/sship.yaml:/app/sship.yaml \
		sship:latest

docker-push:
	@echo "📤 Pushing to Docker..."
	@if [ -z "$(IMAGE_TAG)" ]; then \
		echo "Error: IMAGE_TAG not set. Usage: make docker-push IMAGE_TAG=ghcr.io/username/sship:latest"; \
		exit 1; \
	fi
	docker tag sship:latest $(IMAGE_TAG)
	docker push $(IMAGE_TAG)

help:
	@echo "sship - Makefile commands:"
	@echo "  make dev          - Run in development mode"
	@echo "  make clean        - Remove artifacts"
	@echo ""
	@echo "Docker commands:"
	@echo "  make docker       - Build Docker image"
	@echo "  make docker-run   - Run sship in Docker (Port 9999)"
	@echo "  make docker-push  - Push to Registry (usage: make docker-push IMAGE_TAG=...)"
	@echo ""
	@echo "  make help         - Show this help message"