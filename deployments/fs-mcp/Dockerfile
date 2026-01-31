FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    tar \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install Rust MCP Filesystem binary
RUN set -eux; \
    ARCH=$(uname -m); \
    VERSION="v0.3.8"; \
    URL="https://github.com/rust-mcp-stack/rust-mcp-filesystem/releases/download/${VERSION}/rust-mcp-filesystem-${ARCH}-unknown-linux-gnu.tar.gz"; \
    curl -L "$URL" | tar -xz -C /usr/local/bin --strip-components=1 || \
    curl -L "$URL" | tar -xz -C /usr/local/bin; \
    chmod +x /usr/local/bin/rust-mcp-filesystem

# Clone and install mcp-proxy
RUN git clone --depth 1 --branch v0.10.0 https://github.com/sparfenyuk/mcp-proxy.git /tmp/mcp-proxy && \
    cd /tmp/mcp-proxy && \
    uv sync --frozen --no-dev && \
    mv .venv /app/mcp-proxy-venv && \
    rm -rf /tmp/mcp-proxy

# Install bash-mcp
COPY pyproject.toml server.py ./
RUN uv sync --no-dev && \
    mv .venv /app/bash-mcp-venv

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Setup environment
ENV PATH="/app/mcp-proxy-venv/bin:$PATH"
RUN mkdir -p /data

ENTRYPOINT ["/app/entrypoint.sh"]
