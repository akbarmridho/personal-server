import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextarea } from "@/components/forms/FormField";
import { NativeSelectField } from "@/components/forms/NativeSelectField";
import { NumberField } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/date-utils";
import type { TransactionWithActivitiesFormData } from "@/lib/validations";
import { transactionWithActivitiesSchema } from "@/lib/validations";
import type { ProductWithRelations } from "@/types/database";

interface TransactionFormProps {
  products: ProductWithRelations[];
  onSubmit: (data: TransactionWithActivitiesFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface LineItem {
  variant_id: number;
  quantity: number;
  unit_cost: number;
  unit_revenue: number;
  revenue_adjustment: number;
}

export function TransactionForm({
  products,
  onSubmit,
  onCancel,
  isSubmitting,
}: TransactionFormProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      variant_id: 0,
      quantity: 1,
      unit_cost: 0,
      unit_revenue: 0,
      revenue_adjustment: 0,
    },
  ]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<{ notes?: string }>({
    resolver: zodResolver(
      transactionWithActivitiesSchema.pick({ notes: true }),
    ),
  });

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        variant_id: 0,
        quantity: 1,
        unit_cost: 0,
        unit_revenue: 0,
        revenue_adjustment: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: number,
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate adjustment when manual price is changed
    if (field === "unit_revenue") {
      const variant = products
        .flatMap((p) => p.product_variants || [])
        .find((v) => v.id === updated[index].variant_id);
      if (variant) {
        updated[index].revenue_adjustment = value - variant.sell_price;
      }
    }

    setLineItems(updated);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleVariantChange = (index: number, variantId: number) => {
    const variant = products
      .flatMap((p) => p.product_variants || [])
      .find((v) => v.id === variantId);

    if (variant) {
      const updated = [...lineItems];
      updated[index] = {
        ...updated[index],
        variant_id: variantId,
        unit_cost: variant.cost_price,
        unit_revenue: variant.sell_price,
        revenue_adjustment: 0,
      };
      setLineItems(updated);
    }
  };

  const onFormSubmit = async (formData: { notes?: string }) => {
    // Validate line items
    const newErrors: Record<number, string> = {};
    lineItems.forEach((item, index) => {
      if (item.variant_id === 0) {
        newErrors[index] = "Varian wajib dipilih";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        notes: formData.notes,
        activities: lineItems,
      });
    } catch (error) {
      console.error("Error submitting transaction:", error);
    }
  };

  const totalValue = lineItems.reduce(
    (sum, item) =>
      sum + item.quantity * item.unit_revenue + item.revenue_adjustment,
    0,
  );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <FormTextarea
        label="Catatan Transaksi"
        {...register("notes")}
        error={formErrors.notes?.message}
        placeholder="Catatan opsional..."
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Item Transaksi</h3>
          <Button type="button" size="sm" onClick={addLineItem}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Item
          </Button>
        </div>

        {lineItems.map((item, index) => {
          const selectedVariant = products
            .flatMap((p) => p.product_variants || [])
            .find((v) => v.id === item.variant_id);

          return (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Item #{index + 1}</span>
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <NativeSelectField
                label="Produk & Varian"
                value={item.variant_id.toString()}
                onChange={(e) =>
                  handleVariantChange(index, Number(e.target.value))
                }
                error={errors[index]}
                required
              >
                <option value="0">Pilih varian...</option>
                {products.map((product) => (
                  <optgroup key={product.id} label={product.name}>
                    {product.product_variants?.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name} - Stok: {variant.stock}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelectField>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Kuantitas"
                  value={item.quantity}
                  onChange={(value) => updateLineItem(index, "quantity", value)}
                  min={1}
                  required
                />
                <NumberField
                  label="Harga Jual"
                  value={item.unit_revenue}
                  onChange={(value) =>
                    updateLineItem(index, "unit_revenue", value)
                  }
                  min={0}
                  required
                />
              </div>

              {selectedVariant && item.revenue_adjustment !== 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  Harga normal: {formatCurrency(selectedVariant.sell_price)} •
                  Penyesuaian: {formatCurrency(item.revenue_adjustment)}
                </div>
              )}

              <div className="text-sm font-medium text-right">
                Subtotal:{" "}
                {formatCurrency(
                  item.quantity * item.unit_revenue + item.revenue_adjustment,
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total Transaksi:</span>
          <span>{formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
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
