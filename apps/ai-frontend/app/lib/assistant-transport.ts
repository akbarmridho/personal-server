import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";

/**
 * Creates a transport adapter for Assistant-UI to communicate with Mastra backend
 * @param agentId - The Mastra agent ID to use for chat
 * @returns AssistantChatTransport instance configured for Mastra
 */
export function createMastraTransport(
  agentId: string,
): AssistantChatTransport<UIMessage> {
  const baseUrl = import.meta.env.VITE_MASTRA_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "VITE_MASTRA_BASE_URL is not defined in environment variables",
    );
  }

  return new AssistantChatTransport({
    api: `${baseUrl}/api/chat/${agentId}`,
  });
}
