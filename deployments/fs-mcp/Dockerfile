# -------------------------------------------------------------------
# Stage 1: Clone & Build mcp-proxy (Debian)
# -------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

WORKDIR /app

# 1. Install git
RUN apt-get update && apt-get install -y git

# 2. Clone the mcp-proxy repository (Tag v0.10.0)
# --depth 1: Downloads only the latest commit (faster)
# --branch v0.10.0: Target the specific release you requested
RUN git clone --depth 1 --branch v0.10.0 https://github.com/sparfenyuk/mcp-proxy.git .

# 3. Build the environment
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

# -------------------------------------------------------------------
# Stage 2: Final Runtime Image (Debian Slim)
# -------------------------------------------------------------------
FROM python:3.13-slim-bookworm

WORKDIR /app

# 1. Install Runtime Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    catatonit \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Rust MCP Filesystem (Dynamic Arch)
# Detects ARM64 or Intel and installs the correct GNU binary
RUN set -eux; \
    ARCH=$(uname -m); \
    VERSION="v0.3.8"; \
    echo "Detected architecture: ${ARCH}"; \
    URL="https://github.com/rust-mcp-stack/rust-mcp-filesystem/releases/download/${VERSION}/rust-mcp-filesystem-${ARCH}-unknown-linux-gnu.tar.gz"; \
    echo "Downloading: $URL"; \
    curl -L "$URL" | tar -xz -C /usr/local/bin --strip-components=1 || \
    curl -L "$URL" | tar -xz -C /usr/local/bin; \
    chmod +x /usr/local/bin/rust-mcp-filesystem; \
    mkdir -p /data

# 3. Copy the Python environment
COPY --from=builder /app/.venv /app/.venv

# 4. Setup
ENV PATH="/app/.venv/bin:$PATH"
ENTRYPOINT ["catatonit", "--", "mcp-proxy"]