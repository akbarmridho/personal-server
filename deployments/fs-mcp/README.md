# FS-MCP Deployment

This deployment runs two MCP servers in a single container on different ports.

## MCP Servers

The `mcp-fs` container runs two independent MCP HTTP servers:

### 1. Filesystem MCP (Port 8021)
- **Server**: rust-mcp-filesystem (via mcp-proxy)
- **Purpose**: File system access via MCP
- **Transport**: stdio → HTTP (via mcp-proxy)
- **Capabilities**: Read/write file operations
- **Endpoint**: `http://localhost:8021/sse`

### 2. Bash & Python REPL MCP (Port 8023)
- **Server**: FastMCP (Python)
- **Purpose**: Shell command execution + persistent Python REPL for data analysis
- **Transport**: Native HTTP/SSE (no proxy needed)
- **Default Working Directory**: `/data` (mounted volume)
- **Endpoint**: `http://localhost:8023/sse`
- **Capabilities**:
  - Bash command execution with persistent working directory
  - Python REPL with persistent state (Jupyter-like experience)
  - Pre-installed data analysis libraries
- **Included Libraries**:
  - pandas - Data manipulation and analysis
  - scipy - Scientific computing
  - numpy - Numerical computing
  - mplfinance - Financial chart plotting
  - lightweight-charts - Interactive financial charts

### 3. Notediscovery (Port 8022)
- Separate container for note discovery service
- Data mounted at `/app/data`

## Environment Variables

- `LOCAL_FOLDER_PATH` - Path to local folder to mount (required)
- `ALLOW_WRITE` - Enable write access for filesystem MCP (default: true)

## Usage

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## MCP Endpoints

- **Filesystem**: `http://localhost:8021/sse` - File operations (via mcp-proxy)
- **Bash**: `http://localhost:8023/sse` - Shell commands with data analysis (direct FastMCP)

## MCP Tools

### Filesystem MCP Tools (Port 8021)
Standard file operations via rust-mcp-filesystem:
- Read, write, list files and directories
- File search and pattern matching
- Efficient file system access

### Bash & Python REPL Tools (Port 8023)

**Storage Locations:**
- `/data` - Persistent storage (mounted from host, survives restarts)
- `/tmp` - Temporary storage (cleared on container restart)
- Temp directories - Isolated scratch space via `get_temp_dir()`

**Working Directory Management:**
- `set_cwd(path)` - Set the working directory for bash commands (default: `/data`)
- `get_temp_dir()` - Create a unique temporary directory for scratch work
  - Returns path like `/tmp/mcp_abc123`
  - Perfect for downloads, intermediate files, testing
  - Auto-cleaned on container restart

**Bash Execution:**
- `execute_bash(cmd)` - Execute shell commands in the current working directory
  - Returns: `{stdout, stderr, exit_code}`
  - Persistent working directory across calls
  - Perfect for system commands, file operations, running scripts

**Python REPL (Persistent State with Auto-Cleanup):**
- `execute_python(code)` - Execute Python code in a persistent interpreter session
  - Returns: `{stdout, stderr, result, error, session_reset}`
  - Variables and imports persist between calls (Jupyter-like)
  - **Auto-resets after 30 minutes of inactivity** to prevent memory leaks
  - Access to pandas, scipy, numpy, mplfinance, lightweight-charts
  - Perfect for interactive data analysis workflows
  - Example workflow:
    ```python
    1. execute_python("import pandas as pd")
    2. execute_python("df = pd.read_csv('/data/stocks.csv')")
    3. execute_python("df.describe()")  # df persists from previous call
    4. execute_python("df['price'].mean()")
    ```

- `reset_python()` - Manually clear all variables and imports
  - Returns memory usage before reset
  - Use to start fresh or free up memory after large operations

- `get_python_session_info()` - Monitor session health and memory usage
  - Returns: `{session_active, variables_count, memory_usage_mb, idle_minutes, auto_reset_in_minutes, timeout_setting_minutes}`
  - Check how long until auto-reset
  - Monitor memory consumption
  - Count active variables in session
