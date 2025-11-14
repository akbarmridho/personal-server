import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsAPI } from "@/lib/api";
import type { CreateProduct, UpdateProduct } from "@/types/database";

export function useProducts() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: productsAPI.list,
  });

  const createMutation = useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProduct }) =>
      productsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    createProduct: (data: CreateProduct) => createMutation.mutateAsync(data),
    updateProduct: (id: number, data: UpdateProduct) =>
      updateMutation.mutateAsync({ id, data }),
    deleteProduct: (id: number) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
