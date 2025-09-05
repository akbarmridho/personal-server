FROM oven/bun:1.2.2-slim

# Install curl, git, Node.js (needed by mkfd), then clean up
RUN apt-get update && apt-get install -y curl git gnupg ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
 && apt-get install -y nodejs \
 && rm -rf /var/lib/apt/lists/*

# Playwright env path
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Playwright Chromium (ARM64 friendly)
RUN bunx patchright install --with-deps chromium

WORKDIR /app

# Clone mkfd repo and checkout specific commit
RUN git clone https://github.com/TBosak/mkfd.git /app \
 && cd /app \
 && git checkout 9d6541445e28f5caa46fe6eb18c4a8ff512004a9 \
 && rm -rf .git

# Install dependencies
RUN bun install \
 && apt-get purge -y git \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

EXPOSE 5000
VOLUME ["/app/configs"]

CMD ["bun", "run", "index.ts"]
