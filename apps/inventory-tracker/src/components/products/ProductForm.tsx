import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/FormField";
import { SelectField } from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { naturalSort } from "@/lib/utils";
import {
  type ProductWithVariantsFormData,
  productWithVariantsSchema,
} from "@/lib/validations";
import type {
  ProductWithRelations,
  SyncProductVariants,
} from "@/types/database";
import { VariantManager } from "./VariantManager";

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: ProductWithRelations;
  isLoading?: boolean;
}

export function ProductForm({
  open,
  onClose,
  product,
  isLoading,
}: ProductFormProps) {
  const descriptionId = useId();
  const { categories } = useCategories();
  const { createProduct, syncProduct } = useProducts();
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
      const variants =
        product.product_variants?.map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description || "",
          cost_price: v.cost_price,
          sell_price: v.sell_price,
          stock: v.stock,
        })) || [];

      // Apply natural sorting to variants
      const sortedVariants = variants.sort((a, b) =>
        naturalSort(a.name, b.name),
      );

      setFormData({
        name: product.name,
        category_id: product.category_id,
        description: product.description || "",
        variants: sortedVariants,
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
  }, [product]);

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

    try {
      if (product) {
        const syncData: SyncProductVariants = {
          name: result.data.name,
          category_id: result.data.category_id,
          description: result.data.description,
          variants: result.data.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            description: variant.description,
            cost_price: variant.cost_price,
            sell_price: variant.sell_price,
          })),
        };

        const syncResult = await syncProduct(product.id, syncData);
        if (syncResult.success) {
          toast.success("Produk dan varian berhasil diperbarui");
          onClose();
        } else {
          toast.error(syncResult.message);
        }
      } else {
        // Create new product with initial stock
        const createData = {
          name: result.data.name,
          category_id: result.data.category_id,
          description: result.data.description,
          variants: result.data.variants.map((variant) => ({
            name: variant.name,
            description: variant.description,
            cost_price: variant.cost_price,
            sell_price: variant.sell_price,
            stock: variant.stock || 0,
          })),
        };

        const createResult = await createProduct(createData);
        if (createResult.success) {
          toast.success("Produk berhasil ditambahkan");
          // Reset form fields after successful creation
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
          setErrors({});
          setVariantErrors({});
          onClose();
        } else {
          toast.error(createResult.message);
        }
      }
    } catch (err) {
      console.error("Error saving product:", err);
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan produk",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
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
              value={
                formData.category_id === 0 ? "" : String(formData.category_id)
              }
              onChange={(value) =>
                setFormData({ ...formData, category_id: Number(value) })
              }
              options={categories.map((cat) => ({
                value: String(cat.id),
                label: cat.name,
              }))}
              placeholder="Pilih Kategori"
              error={errors.category_id}
              required
            />

            <div className="space-y-2">
              <Label htmlFor={descriptionId}>Deskripsi</Label>
              <Textarea
                id={descriptionId}
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Deskripsi produk (opsional)"
                className="min-h-[80px]"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <VariantManager
              variants={formData.variants}
              onChange={(variants) => {
                // Apply natural sorting to variants when they change
                const sortedVariants = variants.sort((a, b) =>
                  naturalSort(a.name, b.name),
                );
                setFormData({ ...formData, variants: sortedVariants });
              }}
              errors={variantErrors}
              isEdit={!!product}
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
