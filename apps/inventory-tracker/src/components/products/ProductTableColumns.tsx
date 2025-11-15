import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date-utils";
import type { ProductWithRelations } from "@/types/database";

interface ProductTableColumnsProps {
  onEdit: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
}

export function productColumns({
  onEdit,
  onDelete,
}: ProductTableColumnsProps): ColumnDef<ProductWithRelations>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Nama
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        const canExpand = !!(product.product_variants && product.product_variants.length > 0);
        
        if (canExpand) {
          return (
            <button
              type="button"
              className="min-w-[200px] max-w-[300px] cursor-pointer hover:bg-muted/50 p-2 rounded -m-2 text-left border-0 bg-transparent"
              onClick={row.getToggleExpandedHandler()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  row.getToggleExpandedHandler()();
                }
              }}
            >
              <div className="flex items-center gap-2">
                {row.getIsExpanded() ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{product.name}</div>
                  {product.description && (
                    <div className="text-sm text-muted-foreground whitespace-normal break-words">
                      {product.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        }
        
        return (
          <div className="min-w-[200px] max-w-[300px]">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="font-medium">{product.name}</div>
                {product.description && (
                  <div className="text-sm text-muted-foreground whitespace-normal break-words">
                    {product.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      },
      size: 300,
    },
    {
      id: "category_name",
      accessorKey: "category_name",
      enableSorting: true,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Kategori
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="min-w-[120px]">
          {row.original.category_name || "-"}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "total_stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Stok
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const totalStock = row.original.total_stock || 0;
        const getStockStatus = (stock: number) => {
          if (stock === 0) return "text-red-600";
          if (stock < 15) return "text-yellow-600";
          return "text-green-600";
        };
        return (
          <div className={`font-medium min-w-[80px] text-center ${getStockStatus(totalStock)}`}>
            {totalStock}
          </div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Dibuat
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return <div className="text-muted-foreground min-w-[150px]">{formatDateTime(date)}</div>;
      },
      size: 150,
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Diperbarui
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("updated_at") as string;
        return <div className="text-muted-foreground min-w-[150px]">{formatDateTime(date)}</div>;
      },
      size: 150,
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(row.original)}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(row.original)}
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      size: 100,
    },
  ];
}