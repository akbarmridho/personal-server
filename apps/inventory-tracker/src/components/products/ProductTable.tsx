import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
import { useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/date-utils";
import type { QueryParams } from "@/types/api";
import type { ProductWithRelations } from "@/types/database";
import { StockActions } from "./StockActions";

interface ProductTableProps {
  onAddStock: (variantId: number) => void;
  onEdit: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
}

export function ProductTable({
  onAddStock,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    pageSize: 10,
    sort: { column: "name", direction: "asc" },
    filter: { search: "" },
  });

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const {
    products,
    isLoading,
    totalCount,
    currentPage,
    pageSize,
    totalPages
  } = useProducts(params);

  const toggleRow = (productId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSearchChange = (search: string) => {
    setParams((prev) => ({
      ...prev,
      filter: { ...prev.filter, search },
      page: 1, // Reset to first page when searching
    }));
  };

  const handleSort = (column: string) => {
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

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const getTotalStock = (product: ProductWithRelations) => {
    return product.product_variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  };

  const getTotalValue = (product: ProductWithRelations) => {
    return (
      product.product_variants?.reduce(
        (sum, v) => sum + v.stock * v.sell_price,
        0,
      ) || 0
    );
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return "text-red-600";
    if (stock < 10) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari produk, kategori, atau varian..."
            value={params.filter?.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                Produk{" "}
                {params.sort?.column === "name" &&
                  (params.sort?.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => handleSort("stock")}
              >
                Total Stok{" "}
                {params.sort?.column === "stock" &&
                  (params.sort?.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => handleSort("value")}
              >
                Nilai Total{" "}
                {params.sort?.column === "value" &&
                  (params.sort?.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  {params.filter?.search
                    ? "Tidak ada produk yang ditemukan"
                    : "Belum ada produk"}
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product: ProductWithRelations) => {
                const isExpanded = expandedRows.has(product.id);
                const totalStock = getTotalStock(product);
                const totalValue = getTotalValue(product);

                return (
                  <>
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell onClick={() => toggleRow(product.id)}>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell onClick={() => toggleRow(product.id)}>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => toggleRow(product.id)}>
                        {product.product_categories?.name}
                      </TableCell>
                      <TableCell
                        onClick={() => toggleRow(product.id)}
                        className={`text-right font-medium ${getStockStatus(totalStock)}`}
                      >
                        {totalStock}
                      </TableCell>
                      <TableCell
                        onClick={() => toggleRow(product.id)}
                        className="text-right"
                      >
                        {formatCurrency(totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StockActions
                          onAddStock={() => {}}
                          onEdit={() => onEdit(product)}
                          onDelete={() => onDelete(product)}
                        />
                      </TableCell>
                    </TableRow>

                    {isExpanded && product.product_variants && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <h4 className="text-sm font-medium mb-3">
                              Varian Produk
                            </h4>
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
                                    Nilai
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Aksi
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {product.product_variants.map((variant: any) => (
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
                                      {formatCurrency(
                                        variant.stock * variant.sell_price,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        onClick={() => onAddStock(variant.id)}
                                        size="sm"
                                        variant="outline"
                                      >
                                        Tambah Stok
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Menampilkan{" "}
            {(currentPage - 1) * pageSize + 1}-
            {Math.min(
              currentPage * pageSize,
              totalCount,
            )}{" "}
            dari {totalCount} produk
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
