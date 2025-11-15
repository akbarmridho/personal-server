import { useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { SelectField } from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useCategories";
import {
  type ProductWithVariantsFormData,
  productWithVariantsSchema,
} from "@/lib/validations";
import type { ProductWithRelations } from "@/types/database";
import { VariantManager } from "./VariantManager";

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProductWithVariantsFormData) => Promise<void>;
  product?: ProductWithRelations;
  isLoading?: boolean;
}

export function ProductForm({
  open,
  onClose,
  onSubmit,
  product,
  isLoading,
}: ProductFormProps) {
  const { categories } = useCategories();
  const [formData, setFormData] = useState<ProductWithVariantsFormData>({
    name: "",
    category_id: 0,
    description: "",
    variants: [
      { name: "", description: "", cost_price: 0, sell_price: 0, stock: 0 },
    ],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [variantErrors, setVariantErrors] = useState<
    Record<number, Record<string, string>>
  >({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category_id: product.category_id,
        description: product.description || "",
        variants:
          product.product_variants?.map((v) => ({
            name: v.name,
            description: v.description || "",
            cost_price: v.cost_price,
            sell_price: v.sell_price,
            stock: v.stock,
          })) || [],
      });
    } else {
      setFormData({
        name: "",
        category_id: 0,
        description: "",
        variants: [
          {
            name: "",
            description: "",
            cost_price: 0,
            sell_price: 0,
            stock: 0,
          },
        ],
      });
    }
    setErrors({});
    setVariantErrors({});
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setVariantErrors({});

    const result = productWithVariantsSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      const newVariantErrors: Record<number, Record<string, string>> = {};

      result.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (path.startsWith("variants.")) {
          const match = path.match(/variants\.(\d+)\.(.+)/);
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            if (!newVariantErrors[index]) newVariantErrors[index] = {};
            newVariantErrors[index][field] = err.message;
          }
        } else if (path === "variants") {
          newErrors.variants = err.message;
        } else {
          newErrors[path] = err.message;
        }
      });

      setErrors(newErrors);
      setVariantErrors(newVariantErrors);
      return;
    }

    await onSubmit(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Produk" : "Tambah Produk Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Informasi Produk</h3>

            <FormField
              label="Nama Produk"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Masukkan nama produk"
              error={errors.name}
              required
            />

            <SelectField
              label="Kategori"
              value={String(formData.category_id)}
              onChange={(value) =>
                setFormData({ ...formData, category_id: Number(value) })
              }
              options={categories.map((cat) => ({
                value: String(cat.id),
                label: cat.name,
              }))}
              placeholder="Pilih kategori"
              error={errors.category_id}
              required
            />

            <FormField
              label="Deskripsi"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Deskripsi produk (opsional)"
              error={errors.description}
            />
          </div>

          <div className="space-y-4">
            <VariantManager
              variants={formData.variants}
              onChange={(variants) => setFormData({ ...formData, variants })}
              errors={variantErrors}
            />
            {errors.variants && (
              <p className="text-sm text-red-500">{errors.variants}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : product ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
