import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activitiesAPI } from "@/lib/api";
import type { CreateProductActivity } from "@/types/database";

export function useActivities() {
  const queryClient = useQueryClient();

  const activitiesQuery = useQuery({
    queryKey: ["activities"],
    queryFn: activitiesAPI.list,
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
    activities: activitiesQuery.data || [],
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
