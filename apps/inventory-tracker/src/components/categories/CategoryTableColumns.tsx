import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date-utils";
import type { ProductCategory } from "@/types/database";

interface CategoryTableColumnsProps {
  onEdit: (category: ProductCategory) => void;
  onDelete: (category: ProductCategory) => void;
}

export function categoryColumns({
  onEdit,
  onDelete,
}: CategoryTableColumnsProps): ColumnDef<ProductCategory>[] {
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
      cell: ({ row }) => (
        <div className="font-medium min-w-[150px] max-w-[200px]">{row.getValue("name")}</div>
      ),
      size: 200,
    },
   {
     accessorKey: "description",
     header: ({ column }) => (
       <Button
         variant="ghost"
         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
         className="h-auto p-0 font-semibold"
       >
         Deskripsi
         <ArrowUpDown className="ml-2 h-4 w-4" />
       </Button>
     ),
     cell: ({ row }) => (
       <div className="text-muted-foreground min-w-[200px] max-w-[300px] whitespace-normal break-words">
         {row.getValue("description") || "-"}
       </div>
     ),
     size: 300,
   },
    {
      accessorKey: "products",
      enableSorting: false,
      header: () => (
        <div className="h-auto p-0 font-semibold">
          Jumlah Produk
        </div>
      ),
      cell: ({ row }) => {
        const products = row.getValue("products") as { count: number }[] | undefined;
        const count = Array.isArray(products) ? products[0]?.count : 0;
        return <div className="min-w-[100px]">{count || 0}</div>;
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
