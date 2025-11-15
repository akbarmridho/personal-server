import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextarea } from "@/components/forms/FormField";
import { NativeSelectField } from "@/components/forms/NativeSelectField";
import { NumberField } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/date-utils";
import type { AdjustmentActivityFormData } from "@/lib/validations";
import { adjustmentActivitySchema } from "@/lib/validations";
import type { ProductWithRelations } from "@/types/database";

interface AdjustmentFormProps {
  products: ProductWithRelations[];
  onSubmit: (
    data: AdjustmentActivityFormData,
    type: "Restock" | "Adjustment",
  ) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AdjustmentForm({
  products,
  onSubmit,
  onCancel,
  isSubmitting,
}: AdjustmentFormProps) {
  const [adjustmentType, setAdjustmentType] = useState<
    "Restock" | "Adjustment"
  >("Restock");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdjustmentActivityFormData>({
    resolver: zodResolver(adjustmentActivitySchema),
    defaultValues: {
      variant_id: 0,
      quantity: 1,
      unit_cost: 0,
      notes: "",
    },
  });

  const variantId = watch("variant_id");
  const quantity = watch("quantity");
  const unitCost = watch("unit_cost");

  const selectedVariant = products
    .flatMap((p) => p.product_variants || [])
    .find((v) => v.id === variantId);

  const handleVariantChange = (newVariantId: number) => {
    setValue("variant_id", newVariantId);
    const variant = products
      .flatMap((p) => p.product_variants || [])
      .find((v) => v.id === newVariantId);
    if (variant) {
      setValue("unit_cost", variant.cost_price);
    }
  };

  const totalCost = quantity * unitCost;

  const onFormSubmit = async (data: AdjustmentActivityFormData) => {
    try {
      await onSubmit(data, adjustmentType);
    } catch (error) {
      console.error("Error submitting adjustment:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <NativeSelectField
        label="Tipe Penyesuaian"
        value={adjustmentType}
        onChange={(e) =>
          setAdjustmentType(e.target.value as "Restock" | "Adjustment")
        }
        required
      >
        <option value="Restock">Restock</option>
        <option value="Adjustment">Penyesuaian Stok</option>
      </NativeSelectField>

      <NativeSelectField
        label="Produk & Varian"
        value={variantId.toString()}
        onChange={(e) => handleVariantChange(Number(e.target.value))}
        error={errors.variant_id?.message}
        required
      >
        <option value="0">Pilih varian...</option>
        {products.map((product) => (
          <optgroup key={product.id} label={product.name}>
            {product.product_variants?.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name} - Stok saat ini: {variant.stock}
              </option>
            ))}
          </optgroup>
        ))}
      </NativeSelectField>

      {selectedVariant && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
          <h4 className="font-medium">Informasi Varian</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stok Saat Ini:</span>
              <span className="font-medium">{selectedVariant.stock} unit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga Modal:</span>
              <span>{formatCurrency(selectedVariant.cost_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga Jual:</span>
              <span>{formatCurrency(selectedVariant.sell_price)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Kuantitas"
          value={quantity}
          onChange={(value) => setValue("quantity", value)}
          error={errors.quantity?.message}
          min={1}
          required
        />
        <NumberField
          label="Harga Modal Satuan"
          value={unitCost}
          onChange={(value) => setValue("unit_cost", value)}
          error={errors.unit_cost?.message}
          min={0}
          required
        />
      </div>

      <FormTextarea
        label="Catatan"
        {...register("notes")}
        error={errors.notes?.message}
        placeholder="Alasan atau catatan penyesuaian..."
      />

      {selectedVariant && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Stok Setelah Penyesuaian:
            </span>
            <span className="font-medium">
              {selectedVariant.stock + quantity} unit
            </span>
          </div>
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Biaya:</span>
            <span>{formatCurrency(totalCost)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || !selectedVariant}
          className="flex-1"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Penyesuaian"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
