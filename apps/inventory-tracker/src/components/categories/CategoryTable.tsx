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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/useCategories";
import { PAGINATION } from "@/lib/constants";
import type { QueryParams } from "@/types/api";
import type { ProductCategory } from "@/types/database";
import { categoryColumns } from "./CategoryTableColumns";
import { CategoryTablePagination } from "./CategoryTablePagination";

interface CategoryTableProps {
  onEdit: (category: ProductCategory) => void;
  onDelete: (category: ProductCategory) => void;
}

export function CategoryTable({ onEdit, onDelete }: CategoryTableProps) {
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { categories, isLoading, currentPage, pageSize, totalPages, totalCount } =
    useCategories(params);

  const handleSearchChange = (search: string) => {
    setParams((prev) => ({
      ...prev,
      filter: { ...prev.filter, search },
      page: 1,
    }));
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
    data: categories,
    columns: categoryColumns({ onEdit, onDelete }),
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
    },
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari kategori..."
            value={params.filter?.search || ""}
            onChange={(event) => {
              handleSearchChange(event.target.value);
            }}
            className="pl-9"
          />
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
                      : column.id === "description"
                        ? "Deskripsi"
                        : column.id === "products"
                          ? "Jumlah Produk"
                          : column.id === "created_at"
                            ? "Dibuat"
                            : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm">Tambah Kategori</Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {params.filter?.search
                    ? "Tidak ada kategori yang ditemukan"
                    : "Belum ada kategori"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <CategoryTablePagination
        table={table}
        currentPage={currentPage}
        totalPages={totalPages}
        currentPageItems={categories.length}
        totalItems={totalCount}
      />
    </div>
  );
}
