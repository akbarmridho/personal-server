#!/usr/bin/env node
import "@dotenvx/dotenvx/config.js";

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import type { Request, Response } from "express";
import {
  handleManageAttributes,
  handleReadAttributes,
} from "./modules/attributeHandler.js";
import {
  handleCreateNoteRequest,
  handleDeleteNoteRequest,
  handleGetNoteRequest,
  handleSearchReplaceNoteRequest,
  handleUpdateNoteRequest,
} from "./modules/noteHandler.js";
import { handleResolveNoteRequest } from "./modules/resolveHandler.js";
import { handleSearchNotesRequest } from "./modules/searchHandler.js";
// Import modular components
import { generateTools } from "./modules/toolDefinitions.js";

const TRILIUM_API_URL = process.env.TRILIUM_API_URL;
const TRILIUM_API_TOKEN = process.env.TRILIUM_API_TOKEN;
const PERMISSIONS = process.env.PERMISSIONS || "READ;WRITE";

if (!TRILIUM_API_TOKEN) {
  throw new Error("TRILIUM_API_TOKEN environment variable is required");
}

class TriliumServer {
  private server: Server;
  private axiosInstance;
  private allowedPermissions: string[];

  constructor() {
    this.allowedPermissions = PERMISSIONS.split(";");

    this.server = new Server(
      {
        name: "triliumnext-mcp",
        version: "0.3.13",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.axiosInstance = axios.create({
      baseURL: TRILIUM_API_URL,
      headers: {
        Authorization: TRILIUM_API_TOKEN,
      },
    });

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  hasPermission(permission: string): boolean {
    return this.allowedPermissions.includes(permission);
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Generate standard tools based on permissions
      const tools = generateTools(this);

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, "Arguments are required");
      }

      try {
        switch (request.params.name) {
          // Note management operations
          case "create_note":
            return await handleCreateNoteRequest(
              request.params.arguments,
              this.axiosInstance,
              this,
            );

          case "update_note":
            return await handleUpdateNoteRequest(
              request.params.arguments,
              this.axiosInstance,
              this,
            );

          case "delete_note":
            return await handleDeleteNoteRequest(
              request.params.arguments,
              this.axiosInstance,
              this,
            );

          case "get_note":
            return await handleGetNoteRequest(
              request.params.arguments,
              this.axiosInstance,
              this,
            );

          case "search_and_replace_note":
            return await handleSearchReplaceNoteRequest(
              request.params.arguments,
              this.axiosInstance,
              this,
            );

          // Search and listing operations
          case "search_notes":
            return await handleSearchNotesRequest(
              request.params.arguments,
              this.axiosInstance,
              this,
            );

          case "resolve_note_id":
            return await handleResolveNoteRequest(
              request.params.arguments,
              this,
              this.axiosInstance,
            );

          case "read_attributes":
            return await handleReadAttributes(
              request.params.arguments as any,
              this.axiosInstance,
              this,
            );

          case "manage_attributes":
            return await handleManageAttributes(
              request.params.arguments as any,
              this.axiosInstance,
              this,
            );

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`,
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new McpError(
            ErrorCode.InternalError,
            `TriliumNext API error: ${error.response?.data?.message || error.message}`,
          );
        }
        throw error;
      }
    });
  }

  getServer() {
    return this.server;
  }
}

const server = new TriliumServer();

const app = createMcpExpressApp({
  host: "0.0.0.0",
});

app.post("/mcp", async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.getServer().connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }),
  );
});

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
  console.log(`TriliumNext MCP server running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  await server.getServer().close();
  process.exit(0);
});

// Export helper functions for external use
export { buildNoteParams } from "./utils/noteBuilder.js";
