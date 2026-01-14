import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "../lib/api/knowledge";
import type { InvestmentDocument } from "../lib/api/types";

/**
 * Hook to fetch a single document by ID
 */
export function useDocumentQuery(
  documentId: string,
): UseQueryResult<{ id: string; payload: InvestmentDocument }, Error> {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404
      if (error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to delete a document
 * Redirects to timeline after successful deletion
 */
export function useDeleteDocument(): UseMutationResult<
  void,
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      // Invalidate timeline queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });

      // Redirect to timeline with preserved filters
      navigate(`/timeline/all${location.search}`);
    },
  });
}

/**
 * Hook to update a document
 * Stays on the same page after successful update and invalidates cache
 */
export function useUpdateDocument(): UseMutationResult<
  { count: number; skipped_count: number },
  Error,
  { id: string; payload: Omit<InvestmentDocument, "id"> },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updateDocument(id, payload),
    onSuccess: (_, { id }) => {
      // CRITICAL: Invalidate document query to prevent stale data
      queryClient.invalidateQueries({ queryKey: ["document", id] });

      // Also invalidate timeline to reflect changes
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
