# Trilium MCP - Model Context Protocol Server for TriliumNext Notes

MCP server providing tools to interact with TriliumNext Notes through the Model Context Protocol.

**Credit**: [Triliumnext MCP](https://github.com/tan-yong-sheng/triliumnext-mcp)

⚠️ **DISCLAIMER**: Prototype for TriliumNext/Notes#705. Suggested for developer use only. Backup notes before using.

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript (ESM modules)
- **Framework**: `@modelcontextprotocol/sdk`
- **Server**: Express.js for MCP transport
- **Libraries**:
  - `axios` - HTTP client for Trilium ETAPI
  - `marked` - Markdown processing
  - `@dotenvx/dotenvx` - Environment management

## Configuration

Required environment variables:
- `TRILIUM_API_URL` - Trilium ETAPI endpoint (default: `http://localhost:8080/etapi`)
- `TRILIUM_API_TOKEN` - API token from Trilium settings (required)
- `PERMISSIONS` - Access level (default: `READ;WRITE`)
  - `READ` - Search, get, resolve, read attributes
  - `WRITE` - Create, update, delete notes and attributes
- `VERBOSE` - Debug logging (default: `false`)

## Available Tools

### Search & Discovery
- `search_notes` - Comprehensive search with filters (keywords, dates, attributes, templates, types, MIME types, hierarchy)
- `resolve_note_id` - Find note ID by title

### Note Management
- `get_note` - Retrieve note content by ID (supports regex extraction)
- `create_note` - Create new notes (9 types, supports attributes)
- `update_note` - Update title/content (modes: `overwrite`/`append`, requires `expectedHash`)
- `delete_note` - Permanently delete notes ⚠️

### Attribute Management
- `read_attributes` - Read labels and relations
- `manage_attributes` - Create, update, delete attributes (batch support)

## Usage Examples

### Search & Discovery
- "Find my most recent 10 notes about 'n8n' since the beginning of 2024"
- "Show me notes I've edited in the last 7 days"
- "List all notes under 'n8n Template' folder, including subfolders"

### Content Management
- "Add today's update to my work log" (`update_note` with `append`)
- "Replace this draft with the final version" (`update_note` with `overwrite`)
- "Create a new note called 'Weekly Review' in my journal folder"

## Scripts

- `pnpm build` - Compile TypeScript
- `pnpm start` - Run compiled server
- `pnpm watch` - Development with auto-rebuild
- `pnpm inspector` - Launch MCP inspector

## Port Allocation

- Port **8020** - Trilium MCP Server

See @../../README.md for full port list.

## Documentation

For detailed usage and examples, see:
- README.md#documentation section
- docs/manage-notes-examples/index.md - Safe editing with revision control
- docs/user-query-examples.md - Natural language examples
- docs/search-examples/ - Advanced search syntax

## Integration

Published as `triliumnext-mcp` package. Can be used with:
- Claude Desktop (via configuration)
- Any MCP-compatible client
- Development/local installation

See @README.md for installation instructions.
