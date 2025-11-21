# Production-ready LLM Sandbox

This directory contains a production-grade sandbox image blueprint that can be built and run immediately.

## Files

- `Dockerfile` - Hardened, non-root, minimal tools container based on debian:trixie-slim
- `sandboxd.py` - FastMCP server providing MCP tools for sandbox operations
- `requirements.txt` - Python packages for data analysis, visualization, and web scraping
- `seccomp.json` - Recommended seccomp profile skeleton
- `docker-compose.yaml` - Docker Compose configuration with recommended security flags
- `fastmcp_client_example.py` - Example FastMCP client for connecting to the sandbox

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
- node - Node.js runtime (v24)

### Other Utilities

- sed/awk - Text processing
- find - File searching
- diff/patch - File comparison and patching

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

The sandbox now runs as a FastMCP server exposing MCP tools on port 9000 at the `/mcp` endpoint. The server provides the following MCP tools:

- `execute_command` - Execute shell commands with resource limits
- `execute_python` - Execute Python code with resource limits
- `execute_nodejs` - Execute Node.js code with resource limits
- `read_file` - Read files with intelligent type detection and workspace selection
- `write_file` - Write files with workspace selection
- `list_directory` - List directory contents with workspace selection
- `reset_workspace` - Clear temporary workspace (persistent workspace requires explicit confirmation)
- `reset_persistent_workspace` - Reset persistent workspace with explicit confirmation
- `get_workspace_info` - Get workspace information with workspace selection

### Workspace Types

All file operations support a `workspace` parameter:

- **"temporary"** (default): Files in `/home/sandbox/workspace` - for sandbox operations, safe to reset
- **"persistent"**: Files in `/home/sandbox/persistent` - human-managed datasets, protected from accidental reset

See `fastmcp_client_example.py` for how to connect to the FastMCP server.

The legacy FastAPI endpoints are still available in `sandboxd.py` for reference:

- `POST /run` - Execute a command with resource limits
- `POST /reset` - Wipe the workspace directory
- `GET /health` - Health check

## Security Features

- Non-root user execution
- Read-only root filesystem
- Resource limits (CPU, memory, processes)
- Seccomp profile
- Dropped capabilities
- Network isolation by default

## Python Libraries

The sandbox includes common Python libraries for data analysis and visualization:

- Data manipulation: numpy, pandas, scipy
- Visualization: matplotlib, seaborn, plotly
- Machine learning: scikit-learn
- Web scraping: requests, beautifulsoup4, httpx
- Data formats: openpyxl, xlrd, pyyaml, toml
- Image processing: pillow, PyPDF2
- NLP: nltk
- Database: sqlalchemy
- Utilities: python-dateutil, pytz, tqdm

## File Type Support

The `read_file` tool intelligently handles different file types:

- **Text files**: Returns content directly as text
- **Images**: Returns metadata (dimensions, format, size) and description
- **PDFs**: Returns metadata (page count, size) and text preview if available
- **Binary files**: Returns file type and size information

This prevents LLMs from receiving raw binary data while still providing useful information about non-text files.

## Persistent Storage

The sandbox includes a persistent workspace mounted via rclone WebDAV:

- **Location**: `personal-server/ai-workspace` on your remote storage
- **Purpose**: Store datasets, models, and files managed by humans
- **Protection**: Cannot be accidentally reset by standard reset operations
- **Access**: Use `workspace="persistent"` parameter in file operations

## Production Considerations

- Consider mounting workspace as read-only
- Use the provided seccomp profile
- Monitor logs for suspicious activity
- Consider using AppArmor profiles for additional hardening
