import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atomicProductsAPI, productsAPI } from "@/lib/api";
import type { QueryParams } from "@/types/api";
import type {
  CreateProductWithInitialStock,
  SyncProductVariants,
} from "@/types/database";

export function useProducts(params?: QueryParams) {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products", params],
    queryFn: () => productsAPI.list(params),
    staleTime: 120_000,
  });

  const deleteMutation = useMutation({
    mutationFn: productsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Atomic product creation with initial stock
  const createMutation = useMutation({
    mutationFn: atomicProductsAPI.createWithInitialStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SyncProductVariants }) =>
      atomicProductsAPI.syncProductVariants(id, data),
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
    deleteProduct: (id: number) => deleteMutation.mutateAsync(id),
    createProduct: (data: CreateProductWithInitialStock) =>
      createMutation.mutateAsync(data),
    syncProduct: (id: number, data: SyncProductVariants) =>
      syncMutation.mutateAsync({ id, data }),
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSyncing: syncMutation.isPending,
  };
}
