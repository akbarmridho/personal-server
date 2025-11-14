import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductCategory } from "@/types/database";

interface CategoryActionsProps {
  category: ProductCategory;
  onEdit: (category: ProductCategory) => void;
  onDelete: (category: ProductCategory) => void;
}

export function CategoryActions({
  category,
  onEdit,
  onDelete,
}: CategoryActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => onEdit(category)}
        title="Edit"
      >
        <Pencil />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => onDelete(category)}
        title="Hapus"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
