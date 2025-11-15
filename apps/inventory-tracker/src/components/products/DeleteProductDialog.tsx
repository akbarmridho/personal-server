import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductWithRelations } from "@/types/database";

interface DeleteProductDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  product: ProductWithRelations | null;
  isLoading?: boolean;
}

export function DeleteProductDialog({
  open,
  onClose,
  onConfirm,
  product,
  isLoading,
}: DeleteProductDialogProps) {
  if (!product) return null;

  const variantCount = product.product_variants?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Produk</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus produk "{product.name}"?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600">
            Produk ini memiliki {variantCount} varian. Semua varian akan ikut terhapus.
            Riwayat aktivitas akan tetap ada namun tidak terikat lagi dengan produk ini.
          </p>
          <p className="text-sm text-red-600 mt-2 font-medium">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
