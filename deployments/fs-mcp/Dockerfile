FROM ghcr.io/sparfenyuk/mcp-proxy:v0.3.2-alpine

# Install curl to download the binary
RUN apk add --no-cache curl

# Download rust-mcp-filesystem binary (v0.3.8)
RUN curl -L -o /usr/local/bin/rust-mcp-filesystem \
    https://github.com/rust-mcp-stack/rust-mcp-filesystem/releases/download/v0.3.8/rust-mcp-filesystem-x86_64-unknown-linux-musl

# Make it executable and create data directory
RUN chmod +x /usr/local/bin/rust-mcp-filesystem && mkdir -p /data