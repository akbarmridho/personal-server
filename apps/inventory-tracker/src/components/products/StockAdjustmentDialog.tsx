import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";
import { CurrencyField } from "@/components/forms/CurrencyField";
import { FormTextarea } from "@/components/forms/FormField";
import { NativeSelectField } from "@/components/forms/NativeSelectField";
import { NumberField } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActivities } from "@/hooks/useActivities";
import { useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/date-utils";
import type { AdjustmentActivityFormData } from "@/lib/validations";
import { adjustmentActivitySchema } from "@/lib/validations";
import type { ProductVariant } from "@/types/database";

interface StockAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  variant: ProductVariant | null;
}

export function StockAdjustmentDialog({
  open,
  onClose,
  variant,
}: StockAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<
    "Restock" | "Adjustment"
  >("Restock");
  const { createBatchActivities, isCreatingBatch } = useActivities();
  const { products } = useProducts();

  const getSchema = () => {
    return adjustmentActivitySchema.extend({
      quantity: adjustmentType === "Restock" 
        ? z.number().int().min(1, "Kuantitas minimal 1")
        : z.number().int().refine((val) => val !== 0, "Kuantitas tidak boleh 0")
    });
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdjustmentActivityFormData>({
    resolver: zodResolver(getSchema()),
  });

  useEffect(() => {
    if (variant) {
      reset({
        variant_id: variant.id,
        quantity: adjustmentType === "Restock" ? 1 : 0,
        unit_cost: variant.cost_price,
        notes: "",
      });
      setTotalCost(variant.cost_price);
    }
  }, [variant, reset, adjustmentType]);

  const quantity = watch("quantity");
  const unitCost = watch("unit_cost");
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (quantity && unitCost) {
      setTotalCost(Math.abs(quantity) * unitCost);
    }
  }, [quantity, unitCost]);

  const handleClose = () => {
    reset();
    setAdjustmentType("Restock");
    onClose();
  };

  const onSubmit = async (data: AdjustmentActivityFormData) => {
    if (!variant) return;

    const product = products.find((p) => p.id === variant.product_id);
    if (!product) {
      toast.error("Produk tidak ditemukan");
      return;
    }

    if (data.quantity === 0) {
      toast.info("Tidak ada perubahan stok");
      return;
    }

    const expectedCost = Math.abs(data.quantity) * data.unit_cost;
    const costAdjustment = adjustmentType === "Restock" ? totalCost - expectedCost : 0;

    try {
      await createBatchActivities([{
        product_id: variant.product_id,
        variant_id: variant.id,
        category_id: product.category_id,
        product_name: product.name,
        variant_name: variant.name,
        type: adjustmentType,
        quantity: data.quantity,
        unit_cost: adjustmentType === "Restock" ? data.unit_cost : 0,
        unit_revenue: 0,
        cost_adjustment: costAdjustment,
        revenue_adjustment: 0,
        notes: data.notes,
      }]);

      toast.success(
        adjustmentType === "Restock"
          ? "Stok berhasil ditambahkan"
          : "Stok berhasil disesuaikan"
      );
      handleClose();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menyesuaikan stok"
      );
    }
  };

  if (!variant) return null;

  const finalStock = variant.stock + quantity;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atur Stok</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <NativeSelectField
            label="Tipe Penyesuaian"
            value={adjustmentType}
            onChange={(e) =>
              setAdjustmentType(e.target.value as "Restock" | "Adjustment")
            }
            required
          >
            <option value="Restock">Restock</option>
            <option value="Adjustment">Penyesuaian</option>
          </NativeSelectField>

          <div className="text-sm text-muted-foreground bg-muted/70 p-1 rounded">
            {adjustmentType === "Restock" 
              ? "Restock: Menambah stok dari pembelian/supplier."
              : "Penyesuaian: Koreksi stok karena selisih perhitungan. Gunakan angka negatif untuk mengurangi stok."}
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{variant.name}</span> • Stok: {variant.stock} • Modal Satuan: {formatCurrency(variant.cost_price)}
          </div>

          <NumberField
            label={adjustmentType === "Restock" ? "Jumlah Penambahan Stok" : "Jumlah Penyesuaian"}
            value={quantity}
            onChange={(value) => setValue("quantity", value)}
            error={errors.quantity?.message}
            min={adjustmentType === "Restock" ? 1 : undefined}
            required
          />

          {adjustmentType === "Restock" && (
            <CurrencyField
              label="Total Modal"
              value={totalCost}
              onChange={(value) => setTotalCost(value)}
              required
            />
          )}

          <FormTextarea
            label="Catatan"
            {...register("notes")}
            error={errors.notes?.message}
            placeholder="Alasan atau catatan penyesuaian..."
          />

          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex">
              <span className="text-muted-foreground w-24">Stok Akhir:</span>
              <span>{variant.stock} {quantity !== 0 && `${quantity > 0 ? '+' : '-'} ${quantity > 0 ? quantity : -quantity}`} = <span className="font-semibold">{finalStock} unit</span></span>
            </div>
            {adjustmentType === "Restock" && (
              <div className="flex">
                <span className="text-muted-foreground w-24">Total Modal:</span>
                <span>
                  {formatCurrency(variant.cost_price)} × {Math.abs(quantity)}
                  {totalCost !== Math.abs(quantity) * variant.cost_price && (
                    <>
                      {" "}
                      {totalCost - Math.abs(quantity) * variant.cost_price >= 0 ? "+" : "-"}
                      {" "}
                      {formatCurrency(Math.abs(totalCost - Math.abs(quantity) * variant.cost_price))}
                    </>
                  )}
                  {" = "}
                  <span className="font-semibold">{formatCurrency(totalCost)}</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreatingBatch}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isCreatingBatch}
              className="flex-1"
            >
              {isCreatingBatch ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
