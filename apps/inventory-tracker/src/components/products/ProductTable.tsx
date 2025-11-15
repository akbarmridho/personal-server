import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Search, Settings } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { PAGINATION } from "@/lib/constants";
import { formatCurrency } from "@/lib/date-utils";
import { naturalSort } from "@/lib/utils";
import type { ProductWithVariantsFormData } from "@/lib/validations";
import type { QueryParams } from "@/types/api";
import type { ProductWithRelations } from "@/types/database";
import { DeleteProductDialog } from "./DeleteProductDialog";
import { ProductForm } from "./ProductForm";
import { productColumns } from "./ProductTableColumns";
import { ProductTablePagination } from "./ProductTablePagination";

export function ProductTable() {
  const { categories } = useCategories();
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    sort: { column: "name", direction: "asc" },
    filter: { search: "" },
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    name: true,
    "product_categories.name": true,
    total_stock: true,
    created_at: true,
    updated_at: true,
    actions: true,
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Modal state management
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    products,
    isLoading,
    currentPage,
    pageSize,
    totalPages,
    totalCount,
    error,
  } = useProducts(params);

  const handleEdit = (product: ProductWithRelations) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleDelete = (product: ProductWithRelations) => {
    setSelectedProduct(product);
    setDeleteOpen(true);
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setFormOpen(true);
  };

  const handleSubmit = async (data: ProductWithVariantsFormData) => {
    setIsSubmitting(true);
    try {
      // This would normally call the API
      console.log("Submitting product data:", data);
      toast.success("Produk berhasil disimpan");
      setFormOpen(false);
    } catch (err) {
      console.error("Error saving product:", err);
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan produk",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      // This would normally call the API
      console.log("Deleting product:", selectedProduct.id);
      toast.success("Produk berhasil dihapus");
      setDeleteOpen(false);
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus produk",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStock = (variantId: number) => {
    console.log("Add stock for variant:", variantId);
    toast.info("Fitur tambah stok akan segera hadir");
  };

  // Show error toast when there's a data loading error
  useEffect(() => {
    if (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat produk",
      );
    }
  }, [error]);

  const handleSearchChange = (search: string) => {
    setParams((prev) => ({
      ...prev,
      filter: { ...prev.filter, search },
      page: 1,
    }));
  };

  const handleCategoryChange = (categoryIds: string) => {
    if (categoryIds === "all") {
      setParams((prev) => ({
        ...prev,
        filter: { ...prev.filter, categoryIds: undefined },
        page: 1,
      }));
    } else {
      setParams((prev) => ({
        ...prev,
        filter: { ...prev.filter, categoryIds: [Number(categoryIds)] },
        page: 1,
      }));
    }
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const newSorting =
      typeof updaterOrValue === "function"
        ? updaterOrValue(sorting)
        : updaterOrValue;

    setSorting(newSorting);

    if (newSorting.length > 0) {
      const { id, desc } = newSorting[0];
      setParams((prev) => ({
        ...prev,
        sort: { column: id, direction: desc ? "desc" : "asc" },
        page: 1,
      }));
    }
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setParams((prev) => ({ ...prev, page, pageSize }));
  };

  const table = useReactTable({
    data: products || [],
    columns: productColumns({
      onEdit: handleEdit,
      onDelete: handleDelete,
    }),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function"
          ? updater(table.getState().pagination)
          : updater;
      handlePaginationChange(
        newPagination.pageIndex + 1,
        newPagination.pageSize,
      );
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
      expanded,
    },
    onExpandedChange: (updater) => {
      const newExpanded =
        typeof updater === "function"
          ? updater(table.getState().expanded)
          : updater;
      setExpanded(newExpanded as Record<string, boolean>);
    },
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    getRowCanExpand: (row) => {
      return !!(
        row.original.product_variants &&
        row.original.product_variants.length > 0
      );
    },
  });

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={params.filter?.search || ""}
              onChange={(event) => {
                handleSearchChange(event.target.value);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={params.filter?.categoryIds?.[0]?.toString() || "all"}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-[200px] cursor-pointer">
              <SelectValue placeholder="Filter Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings />
                <span className="hidden sm:inline ml-2">Kustomisasi Kolom</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === "name"
                      ? "Nama"
                      : column.id === "category_name"
                        ? "Kategori"
                        : column.id === "total_stock"
                          ? "Stok"
                          : column.id === "created_at"
                            ? "Dibuat"
                            : column.id === "updated_at"
                              ? "Diperbarui"
                              : column.id === "actions"
                                ? "Aksi"
                                : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={handleAdd}>
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="text-center text-muted-foreground h-24"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const getStockStatus = (stock: number) => {
                  if (stock === 0) return "text-red-600";
                  if (stock < 10) return "text-yellow-600";
                  return "text-green-600";
                };

                return (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell
                          colSpan={row.getAllCells().length}
                          className="p-0"
                        >
                          <div className="bg-gray-50 p-4">
                            <h4 className="text-sm font-medium mb-3">
                              Varian Produk: {row.original.name}
                            </h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nama Varian</TableHead>
                                    <TableHead className="text-right">
                                      Harga Beli
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Harga Jual
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Stok
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Aksi
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {row.original.product_variants
                                    ?.slice()
                                    .sort((a, b) => naturalSort(a.name, b.name))
                                    .map((variant) => (
                                      <TableRow key={variant.id}>
                                        <TableCell>
                                          <div>
                                            <div className="font-medium">
                                              {variant.name}
                                            </div>
                                            {variant.description && (
                                              <div className="text-sm text-gray-500">
                                                {variant.description}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(variant.cost_price)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(variant.sell_price)}
                                        </TableCell>
                                        <TableCell
                                          className={`text-right font-medium ${getStockStatus(variant.stock)}`}
                                        >
                                          {variant.stock}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            onClick={() =>
                                              handleAddStock(variant.id)
                                            }
                                            size="sm"
                                            variant="outline"
                                          >
                                            Tambah Stok
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ),
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {params.filter?.search
                    ? "Tidak ada produk yang ditemukan"
                    : "Belum ada produk"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <ProductTablePagination
        table={table}
        currentPage={currentPage}
        totalPages={totalPages}
        currentPageItems={products?.length || 0}
        totalItems={totalCount}
      />

      {/* Modals */}
      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        product={selectedProduct || undefined}
        isLoading={isSubmitting}
      />

      <DeleteProductDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        product={selectedProduct}
        isLoading={isSubmitting}
      />
    </div>
  );
}
