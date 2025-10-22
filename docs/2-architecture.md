# Personal Server Architecture

## Overview

This is a self-hosted personal server infrastructure running on Docker containers, deployed via Tailscale VPN network. The entire stack is hosted on a Hetzner VM with AMD ARM64 architecture. The domain `*.akbarmr.dev` points to the internal Tailscale network IP, providing secure remote access to all services.

## Network Architecture

### Tailscale VPN Layer

- **Deployment**: All services are accessible through Tailscale VPN
- **Domain**: `*.akbarmr.dev` → Internal Tailscale IP
- **Hostname**: `personal-01`
- **Access**: Requires Tailscale network connection

### Docker Networking

- **Network Name**: `personal_network` (external bridge network)
- **Purpose**: Enables inter-container communication
- **Setup**: `docker network create personal_network`

### Reverse Proxy

- **Service**: Nginx Proxy Manager
- **Ports**:
  - `80` - HTTP
  - `443` - HTTPS
  - `81` - Admin Dashboard
- **Function**: Routes external requests to internal services based on subdomain

## Service Architecture

### 1. Storage & File Management

#### Filen (Port 4001)

- **Type**: Custom Node.js application
- **Purpose**: WebDAV server for Filen cloud storage integration
- **Use Cases**:
  - KeePass database synchronization via FolderSync
  - Aegis backup file sync between devices
  - Network drive mounting
  - WebDAV protocol support
  - Sync capabilities
- **Tech Stack**: TypeScript, @filen/sdk, @filen/webdav
- **Deployment**: PM2 process manager

#### Immich (Port 8009)

- **Purpose**: Photo and video management (Google Photos alternative)
- **Storage**: Uses Filen WebDAV via RClone Docker volume plugin
- **Components**:
  - `immich-server`: Main application server
  - `immich-machine-learning`: ML processing for face recognition, object detection
  - `redis`: Caching layer
- **Volumes**: Separate volumes for thumbnails, encoded videos, library, and profile data

#### Kavita (Port 8004)

- **Purpose**: Digital library and ebook reader
- **Storage**: `/root/filen-sync/kavita_lib` (synced to Filen)
- **Backup**: Automated daily backups via `offen/docker-volume-backup`
- **Retention**: 7 days

### 2. Knowledge Management

#### Obsidian LiveSync (Port 5984)

- **Service**: CouchDB 3.5.0
- **Purpose**: Self-hosted sync server for Obsidian notes
- **Backup**: Custom backup container with 7-day retention
- **Storage**: Persistent volumes for data and configuration
- **Resource Limits**: 384MB reserved, 512MB max memory

#### KB Backend (Custom Application)

- **Purpose**: Knowledge base backend with RAG (Retrieval-Augmented Generation)
- **Architecture**: Microservices with MCP (Model Context Protocol) servers
- **Components**:
  1. **RAG MCP Server**: Document embeddings and retrieval
     - Voyage AI embeddings
     - GFM context path chunking
     - PostgreSQL vector storage
  2. **Internet MCP Server**: Web crawling and search
  3. **Stock MCP Server**: Indonesian stock market data aggregation
  4. **API HTTP Server**: REST API (Elysia framework)
  5. **Proxy Server**: Express.js routing layer
- **Tech Stack**: TypeScript, Elysia, Express, FastMCP, Kysely, PostgreSQL
- **Features**:
  - Document conversion (HTML/PDF to Markdown)
  - Semantic search
  - Stock market analysis (Stockbit integration)

### 3. Database Layer

#### PostgreSQL (Port 5433)

- **Service**: PostgreSQL with custom configuration
- **Databases**:
  - `postgres` (main)
  - `nginx` (Nginx Proxy Manager)
  - `miniflux` (RSS reader)
  - `casdoor` (SSO)
  - `lobe` (Lobe Chat)
  - `activepieces` (workflow automation)
  - `kb-backend` (knowledge base)
- **Backup**: Daily automated backups to `/root/filen-sync/postgres_backup`
- **Admin UI**: pgweb on port 8001

### 4. AI & Automation

#### Lobe Chat (Ports 8007-8008)

- **Components**:
  - `casdoor` (Port 8007): SSO authentication provider
  - `lobe` (Port 8008): AI chat interface
- **Database**: PostgreSQL
- **Features**: Multi-LLM support with SSO authentication
- **Version**: 1.133.4

#### Flowise (Port 8010)

- **Purpose**: Low-code LLM workflow builder
- **Components**:
  - `flowise_server`: Main application
  - `flowise_worker`: Background job processor
  - `flowise_redis`: Queue management
- **Architecture**: Server-worker pattern with Redis queue

#### Activepieces (Port 8006)

- **Purpose**: Workflow automation (Zapier alternative)
- **Components**:
  - Main application
  - Redis for queue management
- **Database**: PostgreSQL
- **Execution Mode**: Unsandboxed
- **URLs**:
  - Internal: `https://ap.akbarmr.dev`
  - Webhook: `https://webhook.akbarmr.dev`
- **Resource Limits**: 768MB reserved, 1GB max memory

### 5. Content & Media

#### RSS Feed System

- **mkfd** (Port 8002): RSS feed generator/aggregator
- **Miniflux** (Port 8003): RSS reader with PostgreSQL backend

### 6. Network Services

#### AdGuard Home (Port 53, 8000)

- **Purpose**: Network-wide ad blocking and DNS server
- **Ports**:
  - `53` (TCP/UDP): DNS server
  - `8000`: Admin dashboard
- **Note**: Requires disabling systemd-resolved daemon

### 7. Monitoring & Management

#### Beszel (Port 8005)

- **Purpose**: Server monitoring and metrics
- **Components**:
  - `beszel`: Hub/dashboard
  - `beszel-agent`: Metrics collector (host network mode)
- **Features**: Docker container monitoring via socket access

#### Dozzle (Port 8011)

- **Purpose**: Real-time Docker log viewer
- **Access**: Web-based interface
- **Monitoring**: All containers via Docker socket

#### Heimdall (Port 8012)

- **Purpose**: Application dashboard/homepage
- **Features**: Centralized access to all services
- **URL**: `https://portal.akbarmr.dev`

## Project Structure

```
personal-server/
├── apps/                          # Custom applications
│   ├── filen/                     # Filen WebDAV integration
│   └── kb-backend/                # Knowledge base backend
├── deployments/                   # Docker compose configurations
│   ├── activepieces/
│   ├── adguard-home/
│   ├── beszel/
│   ├── dozzle/
│   ├── flowise/
│   ├── heimdall/
│   ├── immich/
│   ├── kavita/
│   ├── lobechat/
│   ├── miniflux/
│   ├── mkfd/
│   ├── nginx/
│   ├── obsidian-livesync/
│   ├── postgres/
│   └── rclone/
├── packages/                      # Shared libraries
│   └── common/                    # Common utilities
├── ai-apps/                       # AI agent knowledge bases
│   ├── investment/                # Investment analysis prompts
│   └── personal-finance/
├── playground/                    # Development/testing
└── docs/                          # Documentation
```

## Technology Stack

### Infrastructure

- **Hosting**: Hetzner VM (AMD ARM64)
- **Containerization**: Docker & Docker Compose
- **VPN**: Tailscale
- **Reverse Proxy**: Nginx Proxy Manager
- **Storage**: RClone with Filen backend

### Backend

- **Languages**: TypeScript (Node.js 24+)
- **Package Manager**: PNPM with workspaces
- **Build Tool**: Turbo (monorepo)
- **Process Manager**: PM2
- **Databases**: PostgreSQL, CouchDB, Redis

### Frameworks

- **API**: Elysia (Bun-compatible)
- **Proxy**: Express.js
- **MCP**: FastMCP
- **ORM**: Kysely

### AI/ML

- **Embeddings**: Voyage AI
- **LLM Providers**: OpenAI, Google, OpenRouter
- **Frameworks**: Vercel AI SDK
- **RAG**: Custom implementation with vector search

## Port Allocation

| Service | Port(s) | Protocol | Purpose |
|---------|---------|----------|---------|
| Filen | 4001 | TCP | WebDAV Server |
| AdGuard Home | 53 | TCP/UDP | DNS Server |
| AdGuard Home | 8000 | TCP | Admin Dashboard |
| PostgreSQL | 5433 | TCP | Database |
| pgweb | 8001 | TCP | DB Admin UI |
| mkfd | 8002 | TCP | RSS Generator |
| Miniflux | 8003 | TCP | RSS Reader |
| Kavita | 8004 | TCP | Digital Library |
| CouchDB | 5984 | TCP | Obsidian Sync |
| Beszel | 8005 | TCP | Monitoring |
| Activepieces | 8006 | TCP | Automation |
| Casdoor | 8007 | TCP | SSO |
| Lobe Chat | 8008 | TCP | AI Chat |
| Immich | 8009 | TCP | Photo Management |
| Flowise | 8010 | TCP | LLM Workflows |
| Dozzle | 8011 | TCP | Log Viewer |
| Heimdall | 8012 | TCP | Dashboard |
| Nginx | 80, 443 | TCP | HTTP/HTTPS |
| Nginx Admin | 81 | TCP | Admin Panel |

## Data Persistence Strategy

### Backup Locations

- **Primary Backup Path**: `/root/filen-sync/`
- **Backup Services**:
  - PostgreSQL: Daily full cluster backup
  - Kavita: Daily volume backup (7-day retention)
  - CouchDB: Daily database backup (7-day retention)

### Volume Strategy

- **Named Volumes**: For application data (managed by Docker)
- **Bind Mounts**: For configuration and backups
- **RClone Volumes**: For cloud storage integration (Immich)

## Security Considerations

1. **Network Isolation**: All services on isolated Docker network
2. **VPN Access**: Services only accessible via Tailscale
3. **Reverse Proxy**: Single entry point with SSL/TLS
4. **SSO**: Centralized authentication via Casdoor
5. **DNS Filtering**: AdGuard Home for network-level protection
6. **Secrets Management**: Environment files (not committed to git)

## Monitoring & Observability

- **Container Logs**: Dozzle (real-time)
- **System Metrics**: Beszel (resource usage)
- **Application Dashboard**: Heimdall (service catalog)
- **Database Admin**: pgweb (PostgreSQL)
