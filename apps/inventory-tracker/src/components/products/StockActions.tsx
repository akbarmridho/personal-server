import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StockActionsProps {
  onAddStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StockActions({
  onAddStock,
  onEdit,
  onDelete,
}: StockActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onAddStock}
        size="sm"
        variant="outline"
        title="Tambah Stok"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button onClick={onEdit} size="sm" variant="ghost" title="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        onClick={onDelete}
        size="sm"
        variant="ghost"
        className="text-red-600 hover:text-red-700"
        title="Hapus"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
