import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesAPI } from "@/lib/api";
import type {
  CreateProductCategory,
  UpdateProductCategory,
} from "@/types/database";

export function useCategories() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesAPI.list,
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
    categories: categoriesQuery.data || [],
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
