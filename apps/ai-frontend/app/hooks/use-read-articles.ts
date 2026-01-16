import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getReadArticles,
  markAsRead,
  markAsUnread,
} from "~/lib/api/golden-article-reads";

/**
 * Query hook to fetch all read article IDs for a profile
 */
export function useReadArticles(
  profileId: string | null,
): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: ["golden-article-reads", profileId],
    queryFn: () => getReadArticles(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

interface MarkReadMutationParams {
  profileId: string;
  documentId: string;
}

/**
 * Mutation hook to mark an article as read with optimistic updates
 */
export function useMarkAsRead(): UseMutationResult<
  void,
  Error,
  MarkReadMutationParams,
  { previous: string[] | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, documentId }: MarkReadMutationParams) =>
      markAsRead(profileId, documentId),

    onMutate: async ({ profileId, documentId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["golden-article-reads", profileId],
      });

      // Save previous value for rollback
      const previous = queryClient.getQueryData<string[]>([
        "golden-article-reads",
        profileId,
      ]);

      // Optimistically update
      queryClient.setQueryData<string[]>(
        ["golden-article-reads", profileId],
        (old = []) => {
          // Only add if not already present
          if (old.includes(documentId)) {
            return old;
          }
          return [...old, documentId];
        },
      );

      return { previous };
    },

    onError: (_err, { profileId }, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          ["golden-article-reads", profileId],
          context.previous,
        );
      }
    },

    onSettled: (_, __, { profileId }) => {
      // Refetch to sync with server
      queryClient.invalidateQueries({
        queryKey: ["golden-article-reads", profileId],
      });

      // Invalidate timeline queries to update UI
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

/**
 * Mutation hook to mark an article as unread with optimistic updates
 */
export function useMarkAsUnread(): UseMutationResult<
  void,
  Error,
  MarkReadMutationParams,
  { previous: string[] | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, documentId }: MarkReadMutationParams) =>
      markAsUnread(profileId, documentId),

    onMutate: async ({ profileId, documentId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["golden-article-reads", profileId],
      });

      // Save previous value for rollback
      const previous = queryClient.getQueryData<string[]>([
        "golden-article-reads",
        profileId,
      ]);

      // Optimistically update by filtering out the document
      queryClient.setQueryData<string[]>(
        ["golden-article-reads", profileId],
        (old = []) => old.filter((id) => id !== documentId),
      );

      return { previous };
    },

    onError: (_err, { profileId }, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          ["golden-article-reads", profileId],
          context.previous,
        );
      }
    },

    onSettled: (_, __, { profileId }) => {
      // Refetch to sync with server
      queryClient.invalidateQueries({
        queryKey: ["golden-article-reads", profileId],
      });

      // Invalidate timeline queries to update UI
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
