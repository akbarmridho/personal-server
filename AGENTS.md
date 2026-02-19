# Personal Server

A monorepo containing self-hosted services and applications for personal infrastructure.

## Repository Structure

### Applications (`/apps`)

This repository contains several applications in the `apps/` directory:

- **filen** - Filen network and WebDAV custom integration
- **kb-backend** - Backend for managing document knowledge base with AI/LLM integrations
- **knowledge-service** - Investment knowledge service with Qdrant vector storage for documents, news, filings, analysis, and rumors
- **trilium-mcp** - Model Context Protocol server for TriliumNext Notes

See individual app AGENTS.md files for detailed information:

- @apps/filen/AGENTS.md
- @apps/kb-backend/AGENTS.md
- @apps/knowledge-service/AGENTS.md
- @apps/trilium-mcp/AGENTS.md

### Deployments (`/deployments`)

Docker-based service deployments for self-hosted infrastructure:

- **adguard-home** - Network-wide ad blocking and DNS server (Port 53, 8000)
- **beszel** - Server monitoring dashboard (Port 8005)
- **docling** - Document processing service
- **dozzle** - Real-time Docker container log viewer (Port 8011)
- **fs-mcp** - Filesystem MCP server (Ports 8021, 8022)
- **heimdall** - Application dashboard (Port 8012)
- **immich** - Photo and video backup solution (Port 8009)
- **inngest** - Background job orchestration (Ports 8288, 8289)
- **kavita** - Digital library manager (Port 8004)
- **miniflux** - RSS feed reader (Port 8003)
- **mkfd** - RSS feed service (Port 8002)
- **nginx** - Nginx Proxy Manager (Ports 80, 81, 443)
- **obsidian-livesync** - CouchDB for Obsidian LiveSync (Port 5984)
- **postgres** - PostgreSQL database with pgweb (Ports 5433, 8001)
- **proxy-server** - HTTP/SOCKS proxy server
- **rclone** - Cloud storage sync and mount
- **sandbox** - Sandbox container environment (Ports 8014, 8015)
- **trilium** - Personal knowledge base (Ports 8019, 8020)

All services run on the `personal_network` Docker network.

## General Guidelines

- This is a monorepo using pnpm workspaces
- Node.js version: >=24
- Code formatting: Biome
- Services are containerized with Docker Compose
- Port allocations are documented in @README.md

## Owner Preferences

- Keep implementations minimal and direct. Avoid unnecessary abstraction, scaffolding, and verbose response text.
- When asked to remove a field/behavior, remove it everywhere in scope: runtime payloads, prompts, skills, and code samples.
- Do a full-file audit when asked to "check file content", especially for large prompt/skill files.
- Avoid placeholder/null filler fields in output schemas. Keep payloads strict and purposeful.
- Prefer fail-fast behavior. If any required sub-fetch fails, fail the whole request.
- Do not keep hidden caching when explicitly asked to remove caching.
- Keep internal helper state internal. Do not leak temporary grouping/session markers into public payload contracts.
- When interfaces/features (tools, params, fields, behaviors) are removed, delete them everywhere in scope: code, runtime payloads, prompts, docs, comments, and examples. Do not leave or add "X no longer exists/removed" statements; present only the current valid contract.
