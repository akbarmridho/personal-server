import { ChevronDown, ChevronRight, Search } from "lucide-react";
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
import { formatCurrency } from "@/lib/date-utils";
import type { ProductWithRelations } from "@/types/database";
import { StockActions } from "./StockActions";

interface ProductTableProps {
  products: ProductWithRelations[];
  onAddStock: (variantId: number) => void;
  onEdit: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
}

export function ProductTable({
  products,
  onAddStock,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (productId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = search.toLowerCase();
    const matchesProduct = product.name.toLowerCase().includes(searchLower);
    const matchesCategory = product.product_categories?.name
      .toLowerCase()
      .includes(searchLower);
    const matchesVariant = product.product_variants?.some((v) =>
      v.name.toLowerCase().includes(searchLower),
    );
    return matchesProduct || matchesCategory || matchesVariant;
  });

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Total Stok</TableHead>
              <TableHead className="text-right">Nilai Total</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  {search
                    ? "Tidak ada produk yang ditemukan"
                    : "Belum ada produk"}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
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
                                {product.product_variants.map((variant) => (
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

      <div className="text-sm text-gray-500">
        Menampilkan {filteredProducts.length} dari {products.length} produk
      </div>
    </div>
  );
}
