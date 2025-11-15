import { Plus, Trash2 } from "lucide-react";
import { CurrencyField } from "@/components/forms/CurrencyField";
import { FormField } from "@/components/forms/FormField";
import { NumberField } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VariantFormData } from "@/lib/validations";

interface VariantManagerProps {
  variants: VariantFormData[];
  onChange: (variants: VariantFormData[]) => void;
  errors?: Record<number, Record<string, string>>;
  isEdit?: boolean;
}

export function VariantManager({
  variants,
  onChange,
  errors = {},
  isEdit = false,
}: VariantManagerProps) {
  const addVariant = () => {
    onChange([
      ...variants,
      {
        name: "",
        description: "",
        cost_price: 0,
        sell_price: 0,
        stock: 0,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (
    index: number,
    field: keyof VariantFormData,
    value: string | number,
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Varian <span className="text-red-500">*</span>
        </h3>
        <Button type="button" onClick={addVariant} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Tambah Varian
        </Button>
      </div>

      {variants.map((variant, index) => {
        const variantKey = `variant-${index}`;
        return (
          <div key={variantKey} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Varian {index + 1}</h4>
              {variants.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeVariant(index)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <FormField
                label="Nama Varian"
                value={variant.name}
                onChange={(e) => updateVariant(index, "name", e.target.value)}
                placeholder="Contoh: Merah, Besar, 500ml"
                error={errors[index]?.name}
                required
              />

              <div className="space-y-2">
                <Label htmlFor={`description-${index}`}>Deskripsi</Label>
                <Textarea
                  id={`description-${index}`}
                  value={variant.description || ""}
                  onChange={(e) =>
                    updateVariant(index, "description", e.target.value)
                  }
                  placeholder="Deskripsi varian (opsional)"
                  className="min-h-[80px]"
                />
                {errors[index]?.description && (
                  <p className="text-sm text-destructive">
                    {errors[index]?.description}
                  </p>
                )}
              </div>
            </div>

            <div
              className={`grid gap-4 ${isEdit ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}
            >
              <CurrencyField
                label="Harga Modal"
                value={variant.cost_price}
                onChange={(value) => updateVariant(index, "cost_price", value)}
                placeholder="0"
                error={errors[index]?.cost_price}
                required
              />
              <CurrencyField
                label="Harga Jual"
                value={variant.sell_price}
                onChange={(value) => updateVariant(index, "sell_price", value)}
                placeholder="0"
                error={errors[index]?.sell_price}
                required
              />
              {!isEdit && (
                <NumberField
                  label="Stok Awal"
                  value={variant.stock || 0}
                  onChange={(value) => updateVariant(index, "stock", value)}
                  placeholder="0"
                  error={errors[index]?.stock}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
