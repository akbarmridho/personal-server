import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createThread, deleteThread, getThreads } from "~/lib/api/mastra";

/**
 * Hook to fetch all threads for an agent
 */
export function useThreads(agentId: string) {
  return useQuery({
    queryKey: ["threads", agentId],
    queryFn: () => getThreads(agentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to create a new thread
 */
export function useCreateThread(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createThread(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads", agentId] });
    },
  });
}

/**
 * Hook to delete a thread
 */
export function useDeleteThread(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => deleteThread(agentId, threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads", agentId] });
    },
  });
}
