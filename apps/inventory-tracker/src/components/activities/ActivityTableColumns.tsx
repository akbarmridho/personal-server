import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/date-utils";
import type { ProductActivityWithRelations } from "@/types/database";

interface GroupedActivity {
  id: string;
  type: "transaction" | "single";
  transaction_id?: number;
  activities: ProductActivityWithRelations[];
  created_at: string;
  total_value: number;
  notes?: string;
}

interface ActivityTableColumnsProps {
  onEdit?: (activity: GroupedActivity) => void;
  onDelete?: (activity: GroupedActivity) => void;
}

export function activityColumns({
  onEdit,
  onDelete,
}: ActivityTableColumnsProps): ColumnDef<GroupedActivity>[] {
  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Tanggal
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return <div className="text-muted-foreground">{formatDateTime(date)}</div>;
      },
    },
    {
      accessorKey: "product_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Produk
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const hasTransaction = item.type === "transaction";
        
        if (hasTransaction) {
          return (
            <button
              type="button"
              className="cursor-pointer hover:bg-muted/50 p-2 rounded -m-2 text-left border-0 bg-transparent"
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
                  <div className="font-medium">{item.activities[0]?.product_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Transaksi #{item.transaction_id}
                  </div>
                </div>
              </div>
            </button>
          );
        }
        
        return (
          <div>
            <div className="font-medium">{item.activities[0]?.product_name}</div>
            <div className="text-sm text-muted-foreground">{item.activities[0]?.variant_name || ""}</div>
          </div>
        );
      },
    },
    {
      id: "variant_name",
      accessorKey: "variant_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Varian
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        if (item.type === "transaction") {
          return <div>-</div>;
        }
        return <div>{item.activities[0]?.variant_name || ""}</div>;
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Tipe
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const type = item.type === "transaction" ? item.activities[0]?.type : item.activities[0]?.type;
        return (
          <span
            className={`text-xs px-2 py-1 rounded ${
              type === "Sales"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : type === "Restock"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : type === "Refund"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            }`}
          >
            {type ? ACTIVITY_TYPE_LABELS[type as keyof typeof ACTIVITY_TYPE_LABELS] : "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Qty
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const quantity = item.type === "transaction" 
          ? item.activities.reduce((sum, a) => sum + a.quantity, 0)
          : item.activities[0]?.quantity || 0;
        return (
          <div className="text-center font-medium">
            {quantity}
          </div>
        );
      },
    },
    {
      accessorKey: "unit_price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Harga
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const activity = item.activities[0];
        const price = activity?.type === "Sales" || activity?.type === "Refund" 
          ? activity.unit_revenue 
          : activity?.unit_cost || 0;
        return (
          <div className="text-right">
            {formatCurrency(price)}
          </div>
        );
      },
    },
    {
      accessorKey: "total_value",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right font-medium">
            {formatCurrency(item.total_value)}
          </div>
        );
      },
    },
    {
      accessorKey: "notes",
      header: "Catatan",
      cell: ({ row }) => {
        const item = row.original;
        const displayNotes = item.notes;
        
        return (
          <div>
            {displayNotes ? (
              <div className="text-sm text-muted-foreground truncate" title={displayNotes}>
                {displayNotes}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">-</div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(row.original)}
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(row.original)}
              title="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];
}