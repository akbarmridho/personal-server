FROM debian:trixie-slim

ENV DEBIAN_FRONTEND=noninteractive

# Create non-root user
RUN groupadd -r sandbox && useradd -r -g sandbox -m -d /home/sandbox sandbox

# Install necessary packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates curl wget unzip procps build-essential \
       ripgrep jq fd-find psmisc python3 python3-pip \
       sed gawk findutils diffutils patch yq \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 24
RUN set -eux; \
    ARCH=$(dpkg --print-architecture); \
    NODE_VERSION=$(curl -s https://nodejs.org/dist/latest-v24.x/ | grep -oP 'node-v\K[0-9]+\.[0-9]+\.[0-9]+' | head -1); \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.xz" -o /tmp/node.tar.xz \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && rm -rf /tmp/node.tar.xz

# Install ast-grep (sg) if available; fallback: skip
RUN set -eux; \
    if curl -fsSL --head https://github.com/ast-grep/ast-grep/releases/latest >/dev/null 2>&1; then \
      ARCH=$(dpkg --print-architecture | sed 's/amd64/x86_64/;s/arm64/aarch64/') && \
      curl -fsSL "https://github.com/ast-grep/ast-grep/releases/latest/download/ast-grep-${ARCH}-unknown-linux-musl.zip" -o /tmp/ast.zip \
      && unzip /tmp/ast.zip -d /usr/local/bin \
      && chmod +x /usr/local/bin/sg || true; \
    fi

# Install tree-sitter CLI
RUN set -eux; \
    if curl -fsSL --head https://github.com/tree-sitter/tree-sitter/releases/latest >/dev/null 2>&1; then \
      ARCH=$(dpkg --print-architecture) && \
      VERSION=$(curl -s https://api.github.com/repos/tree-sitter/tree-sitter/releases/latest | grep tag_name | cut -d '"' -f 4) && \
      curl -fsSL "https://github.com/tree-sitter/tree-sitter/releases/download/${VERSION}/tree-sitter-linux-${ARCH}.gz" -o /tmp/tree-sitter.gz \
      && gunzip -c /tmp/tree-sitter.gz > /usr/local/bin/tree-sitter \
      && chmod +x /usr/local/bin/tree-sitter || true; \
    fi

# Install python dependencies from requirements.txt
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r /tmp/requirements.txt \
    && rm -rf /tmp/requirements.txt

# Copy the sandbox daemon
COPY sandboxd.py /usr/local/bin/sandboxd.py
RUN chmod +x /usr/local/bin/sandboxd.py

# Expose API port (internal; container will be network-isolated)
EXPOSE 9000

# Switch to non-root user for runtime
USER sandbox
WORKDIR /home/sandbox

# Entrypoint runs sandboxd (MCP server)
ENTRYPOINT ["/usr/bin/env", "python3", "/usr/local/bin/sandboxd.py"]