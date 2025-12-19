/**
 * Search Handler Module
 * Centralized request handling for search operations
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { formatNotesForListing } from "../utils/noteFormatter.js";
import type { PermissionChecker } from "../utils/permissionUtils.js";
import { handleSearchNotes, type SearchOperation } from "./searchManager.js";

/**
 * Handle search_notes tool requests
 */
export async function handleSearchNotesRequest(
  args: any,
  axiosInstance: any,
  permissionChecker: PermissionChecker,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!permissionChecker.hasPermission("READ")) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Permission denied: Not authorized to search notes.",
    );
  }

  try {
    const searchOperation: SearchOperation = {
      text: args.text,
      searchCriteria: args.searchCriteria,
      limit: args.limit,
    };

    const result = await handleSearchNotes(searchOperation, axiosInstance);
    const resultsText = JSON.stringify(result.results, null, 2);

    return {
      content: [
        {
          type: "text",
          text: `${result.debugInfo || ""}${resultsText}`,
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      error instanceof Error ? error.message : String(error),
    );
  }
}
