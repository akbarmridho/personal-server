import { useQuery } from "@tanstack/react-query";
import { getThreadMessages } from "~/lib/api/mastra";

/**
 * Hook to fetch messages for a specific thread
 */
export function useThreadMessages(agentId: string, threadId?: string) {
  return useQuery({
    queryKey: ["thread-messages", agentId, threadId],
    queryFn: () => (threadId ? getThreadMessages(agentId, threadId) : []),
    enabled: Boolean(threadId),
    staleTime: 0, // Always fetch fresh messages
    gcTime: 0, // Don't cache
  });
}
