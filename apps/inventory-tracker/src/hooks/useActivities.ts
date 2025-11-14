import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activitiesAPI } from "@/lib/api";
import type { QueryParams } from "@/types/api";
import type { CreateProductActivity } from "@/types/database";

export function useActivities(params?: QueryParams) {
  const queryClient = useQueryClient();

  const activitiesQuery = useQuery({
    queryKey: ["activities", params],
    queryFn: () => activitiesAPI.list(params),
    staleTime: 120_000,
  });

  const createMutation = useMutation({
    mutationFn: activitiesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: activitiesAPI.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return {
    activities: activitiesQuery.data?.data || [],
    totalCount: activitiesQuery.data?.totalCount || 0,
    currentPage: activitiesQuery.data?.currentPage || 1,
    pageSize: activitiesQuery.data?.pageSize || 20,
    totalPages: activitiesQuery.data?.totalPages || 0,
    isLoading: activitiesQuery.isLoading,
    error: activitiesQuery.error,
    createActivity: (data: CreateProductActivity) =>
      createMutation.mutateAsync(data),
    createBatchActivities: (data: CreateProductActivity[]) =>
      createBatchMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    isCreatingBatch: createBatchMutation.isPending,
  };
}
