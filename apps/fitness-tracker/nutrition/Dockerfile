# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:24-slim AS build

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# Copy package files and install deps (including native better-sqlite3)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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

# Install pnpm and production deps (rebuilds better-sqlite3 for runtime arch)
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=build /app/dist ./dist

# Copy scripts (garmin sync)
COPY scripts/ ./scripts/

# Copy drizzle migrations
COPY drizzle/ ./drizzle/

# data/food-search.db is volume-mounted at runtime, not baked into image.
# Run `pnpm run setup-db` on the host to build it.

EXPOSE 8027

CMD ["node", "dist/index.js"]
