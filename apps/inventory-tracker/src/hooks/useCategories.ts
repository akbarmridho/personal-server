import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesAPI } from "@/lib/api";
import type { QueryParams } from "@/types/api";
import type {
  CreateProductCategory,
  UpdateProductCategory,
} from "@/types/database";

export function useCategories(params?: QueryParams) {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories", params],
    queryFn: () => categoriesAPI.list(params),
    staleTime: 120_000,
  });

  const createMutation = useMutation({
    mutationFn: categoriesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductCategory }) =>
      categoriesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return {
    categories: categoriesQuery.data?.data || [],
    totalCount: categoriesQuery.data?.totalCount || 0,
    currentPage: categoriesQuery.data?.currentPage || 1,
    pageSize: categoriesQuery.data?.pageSize || 10,
    totalPages: categoriesQuery.data?.totalPages || 0,
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    createCategory: (data: CreateProductCategory) =>
      createMutation.mutateAsync(data),
    updateCategory: (id: number, data: UpdateProductCategory) =>
      updateMutation.mutateAsync({ id, data }),
    deleteCategory: (id: number) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
