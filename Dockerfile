# Multi-stage build for minimal image size
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o sship cmd/web/*.go

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/sship .

# Copy static assets and templates
COPY --from=builder /build/cmd/web/static ./cmd/web/static
COPY --from=builder /build/cmd/web/templates ./cmd/web/templates

# Create volume for config file
VOLUME ["/app/config"]

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["./sship"]
CMD ["-config", "/app/config/sship.yaml"]