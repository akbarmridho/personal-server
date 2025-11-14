import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/lib/date-utils";
import type { QueryParams } from "@/types/api";
import type { ProductCategory } from "@/types/database";
import { CategoryActions } from "./CategoryActions";

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

  const {
    categories,
    isLoading,
    totalCount,
    currentPage,
    pageSize,
    totalPages
  } = useCategories(params);

  const handleSearchChange = (search: string) => {
    setParams((prev) => ({
      ...prev,
      filter: { ...prev.filter, search },
      page: 1, // Reset to first page when searching
    }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleSort = (column: "name" | "created_at") => {
    setParams((prev) => ({
      ...prev,
      sort: {
        column,
        direction:
          prev.sort?.column === column && prev.sort?.direction === "asc"
            ? "desc"
            : "asc",
      },
      page: 1, // Reset to first page when sorting
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari kategori..."
            value={params.filter?.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                Nama{" "}
                {params.sort?.column === "name" &&
                  (params.sort?.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Jumlah Produk</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("created_at")}
              >
                Dibuat{" "}
                {params.sort?.column === "created_at" &&
                  (params.sort?.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  {params.filter?.search
                    ? "Tidak ada kategori yang ditemukan"
                    : "Belum ada kategori"}
                </TableCell>
              </TableRow>
            ) : (
              categories?.map((category: ProductCategory) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>{category.product_count || 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(category.created_at)}
                  </TableCell>
                  <TableCell>
                    <CategoryActions
                      category={category}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan{" "}
            {(currentPage - 1) * pageSize + 1}-
            {Math.min(
              currentPage * pageSize,
              totalCount,
            )}{" "}
            dari {totalCount} kategori
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft />
              Sebelumnya
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Selanjutnya
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
