FROM ghcr.io/sparfenyuk/mcp-proxy:v0.10.0

RUN apk add --no-cache curl

# Install Rust MCP Filesystem dynamically based on architecture
RUN set -eux; \
    ARCH=$(uname -m); \
    VERSION="v0.3.8"; \
    echo "Detected architecture: ${ARCH}"; \
    # The release filenames use 'x86_64' and 'aarch64', which matches uname -m output directly
    curl -fsSL "https://github.com/rust-mcp-stack/rust-mcp-filesystem/releases/download/${VERSION}/rust-mcp-filesystem-${ARCH}-unknown-linux-musl" -o /usr/local/bin/rust-mcp-filesystem \
    && chmod +x /usr/local/bin/rust-mcp-filesystem \
    && mkdir -p /data \
    # Verify installation
    && rust-mcp-filesystem --version