# Production-ready LLM Sandbox

This directory contains a production-grade sandbox image blueprint that can be built and run immediately.

## Files

- `Dockerfile` - Hardened, non-root, minimal tools container based on debian:trixie-slim
- `sandboxd.py` - FastMCP server providing MCP tools for sandbox operations
- `requirements.txt` - Python packages for data analysis, visualization, and web scraping
- `docker-compose.yaml` - Docker Compose configuration with recommended security flags

## Installed Tools

### Search Tools

- ripgrep (rg) - Fast text search
- ast-grep (sg) - AST-based code search
- tree-sitter CLI - Parser generator tool
- fd (fd-find) - User-friendly file finder

### Parsing/Transform Tools

- jq - JSON processor
- yq - YAML processor
- python3 - Python interpreter with data science libraries
- node - Node.js runtime (latest v24.x)

### Other Utilities

- sed/gawk - Text processing
- find - File searching
- diffutils/patch - File comparison and patching

## Quick Start

1. Build the image:

   ```bash
   docker build -t sandbox:latest .
   ```

2. Run with Docker Compose:

   ```bash
   docker-compose up -d
   ```

   This will create:
   - Temporary workspace: Local `./workspace` directory (for sandbox operations)
   - Persistent workspace: Remote `personal-server/ai-workspace` via WebDAV (human-managed files)

## Usage

The sandbox runs as a FastMCP server exposing MCP tools on port 9000 at the `/mcp` endpoint. The server provides the following MCP tools:

- `execute_command` - Execute shell commands with resource limits and workspace selection
- `execute_code` - Execute Python or JavaScript code with resource limits
- `read_file` - Read files with intelligent type detection and workspace selection

### Workspace Types

All file operations support a `workspace` parameter:

- **"temporary"** (default): Files in `/home/sandbox/workspace` - for sandbox operations
- **"persistent"**: Files in `/home/sandbox/persistent` - human-managed datasets via WebDAV

## Security Features

- Non-root user execution (sandbox user)
- Resource limits (CPU: 10s, Memory: 512MB, File descriptors: 64)
- Command timeout (30s default)
- Container isolation with limited resources

## Python Libraries

The sandbox includes minimal Python libraries:

- FastMCP server: fastmcp
- File type detection: pillow (images), PyPDF2 (PDFs)

Additional libraries can be installed on-demand using `execute_command` with pip.

## File Type Support

The `read_file` tool intelligently handles different file types:

- **Text files**: Returns content directly as text
- **Images**: Returns metadata (dimensions, format, size) via Pillow
- **PDFs**: Returns metadata (page count, size) and text preview via PyPDF2
- **Binary files**: Returns file type and size information

## Persistent Storage

The sandbox includes a persistent workspace mounted via rclone WebDAV:

- **Location**: `personal-server/ai-workspace` on remote storage (Filen WebDAV)
- **Purpose**: Store datasets, models, and files managed by humans
- **Access**: Use `workspace="persistent"` parameter in file operations
- **Mount**: `/home/sandbox/persistent` (read-write)

## Docker Compose Configuration

- **Port**: 8014 (host) → 9000 (container)
- **Resources**: 0.5 CPU, 512MB memory limit
- **Volumes**:
  - `sandbox_tmp`: Temporary workspace
  - `sandbox_workspace`: Persistent workspace via rclone WebDAV
- **Restart**: unless-stopped
