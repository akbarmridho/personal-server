import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsAPI } from "@/lib/api";
import type { QueryParams } from "@/types/api";
import type { CreateProduct, UpdateProduct } from "@/types/database";

export function useProducts(params?: QueryParams) {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products", params],
    queryFn: () => productsAPI.list(params),
    staleTime: 120_000,
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
    products: productsQuery.data?.data || [],
    totalCount: productsQuery.data?.totalCount || 0,
    currentPage: productsQuery.data?.currentPage || 1,
    pageSize: productsQuery.data?.pageSize || 10,
    totalPages: productsQuery.data?.totalPages || 0,
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
