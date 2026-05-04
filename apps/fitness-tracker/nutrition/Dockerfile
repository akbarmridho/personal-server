# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:24-slim AS build

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and install deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle.config.ts ./
RUN pnpm run build

# --- Runtime stage ---
FROM node:24-slim AS runtime

WORKDIR /app

# Install Python for Garmin sync script
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*

# Install garminconnect in a venv
RUN python3 -m venv /opt/garmin-venv \
  && /opt/garmin-venv/bin/pip install --no-cache-dir garminconnect
ENV PATH="/opt/garmin-venv/bin:$PATH"

# Install pnpm and production deps
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle.config.ts ./

# Copy data directory (USDA JSON will be mounted or pre-loaded)
COPY data/ ./data/

# Copy scripts
COPY scripts/ ./scripts/

# Copy drizzle migrations if they exist
COPY drizzle/ ./drizzle/ 2>/dev/null || true

# Entry point: run migrations then start bot
CMD ["sh", "-c", "npx drizzle-kit migrate && node dist/index.js"]
