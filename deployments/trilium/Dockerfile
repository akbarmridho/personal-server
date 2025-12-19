# Use a stable, slim Node.js base
FROM node:22-slim

# Create app directory
WORKDIR /app

# Install the MCP server globally or run via npx
# We use npx -y to ensure it runs without interaction
ENTRYPOINT ["npx", "-y", "triliumnext-mcp"]