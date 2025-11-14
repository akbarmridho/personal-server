"use client";

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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/date-utils";
import type { ProductWithRelations } from "@/types/database";
import { StockActions } from "./StockActions";

interface EnhancedProductTableProps {
  products: ProductWithRelations[];
  onAddStock: (variantId: number) => void;
  onEdit: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
}

export function EnhancedProductTable({
  products,
  onAddStock,
  onEdit,
  onDelete,
}: EnhancedProductTableProps) {
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    category: true,
    stock: true,
    value: true,
    actions: true,
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const toggleRow = (productId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleRowSelection = (productId: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === filteredProducts.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredProducts.map(p => p.id)));
    }
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

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

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
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari produk, kategori, atau varian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Kolom
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={columnVisibility.name}
                onCheckedChange={(checked) => 
                  setColumnVisibility(prev => ({ ...prev, name: checked }))
                }
              >
                Nama Produk
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.category}
                onCheckedChange={(checked) => 
                  setColumnVisibility(prev => ({ ...prev, category: checked }))
                }
              >
                Kategori
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.stock}
                onCheckedChange={(checked) => 
                  setColumnVisibility(prev => ({ ...prev, stock: checked }))
                }
              >
                Total Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.value}
                onCheckedChange={(checked) => 
                  setColumnVisibility(prev => ({ ...prev, value: checked }))
                }
              >
                Nilai Total
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.actions}
                onCheckedChange={(checked) => 
                  setColumnVisibility(prev => ({ ...prev, actions: checked }))
                }
              >
                Aksi
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedRows.size === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleAllRows}
                  aria-label="Select all"
                />
              </TableHead>
              {columnVisibility.name && <TableHead>Produk</TableHead>}
              {columnVisibility.category && <TableHead>Kategori</TableHead>}
              {columnVisibility.stock && <TableHead className="text-right">Total Stok</TableHead>}
              {columnVisibility.value && <TableHead className="text-right">Nilai Total</TableHead>}
              {columnVisibility.actions && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  {search
                    ? "Tidak ada produk yang ditemukan"
                    : "Belum ada produk"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product) => {
                const isExpanded = expandedRows.has(product.id);
                const isSelected = selectedRows.has(product.id);
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
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRowSelection(product.id)}
                          aria-label={`Select ${product.name}`}
                        />
                      </TableCell>
                      {columnVisibility.name && (
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
                      )}
                      {columnVisibility.category && (
                        <TableCell onClick={() => toggleRow(product.id)}>
                          {product.product_categories?.name}
                        </TableCell>
                      )}
                      {columnVisibility.stock && (
                        <TableCell
                          onClick={() => toggleRow(product.id)}
                          className={`text-right font-medium ${getStockStatus(totalStock)}`}
                        >
                          {totalStock}
                        </TableCell>
                      )}
                      {columnVisibility.value && (
                        <TableCell onClick={() => toggleRow(product.id)} className="text-right">
                          {formatCurrency(totalValue)}
                        </TableCell>
                      )}
                      {columnVisibility.actions && (
                        <TableCell className="text-right">
                          <StockActions
                            onAddStock={() => {}}
                            onEdit={() => onEdit(product)}
                            onDelete={() => onDelete(product)}
                          />
                        </TableCell>
                      )}
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
                                  <TableHead className="text-right">Harga Beli</TableHead>
                                  <TableHead className="text-right">Harga Jual</TableHead>
                                  <TableHead className="text-right">Stok</TableHead>
                                  <TableHead className="text-right">Nilai</TableHead>
                                  <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {product.product_variants.map((variant) => (
                                  <TableRow key={variant.id}>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium">{variant.name}</div>
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
                                      {formatCurrency(variant.stock * variant.sell_price)}
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

      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-sm text-gray-500">
          Menampilkan {(currentPage - 1) * pageSize + 1} hingga{" "}
          {Math.min(currentPage * pageSize, filteredProducts.length)} dari{" "}
          {filteredProducts.length} produk
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            Pertama
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Sebelumnya
          </Button>
          <div className="text-sm text-gray-500">
            Halaman {currentPage} dari {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Selanjutnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Terakhir
          </Button>
        </div>
      </div>
    </div>
  );
}