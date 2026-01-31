#!/bin/bash
set -e

# Start mcp-proxy for rust-mcp-filesystem (stdio to HTTP)
/app/mcp-proxy-venv/bin/mcp-proxy \
  --port 8080 \
  --host 0.0.0.0 \
  --stateless \
  -- \
  rust-mcp-filesystem --allow-write /data &

# Start FastMCP HTTP server for bash MCP
/app/bash-mcp-venv/bin/fastmcp run /app/server.py \
  --transport sse \
  --port 8081 \
  --host 0.0.0.0 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
