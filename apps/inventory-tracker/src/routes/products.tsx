import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductTable } from "@/components/products/ProductTable";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { activitiesAPI, productsAPI, variantsAPI } from "@/lib/api";
import type { ProductWithVariantsFormData } from "@/lib/validations";
import type { ProductWithRelations } from "@/types/database";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { isLoading, error } = useProducts();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = () => {
    setSelectedProduct(null);
    setFormOpen(true);
  };

  const handleEdit = (product: ProductWithRelations) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleDelete = (product: ProductWithRelations) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: ProductWithVariantsFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedProduct) {
        await productsAPI.update(selectedProduct.id, {
          name: data.name,
          category_id: data.category_id,
          description: data.description,
        });

        const existingVariantIds =
          selectedProduct.product_variants?.map((v) => v.id) || [];
        const newVariants = data.variants.filter(
          (_, i) => !existingVariantIds[i],
        );

        for (let i = 0; i < data.variants.length; i++) {
          const variant = data.variants[i];
          if (existingVariantIds[i]) {
            await variantsAPI.update(existingVariantIds[i], {
              name: variant.name,
              description: variant.description,
              cost_price: variant.cost_price,
              sell_price: variant.sell_price,
            });
          }
        }

        for (const variant of newVariants) {
          const created = await variantsAPI.create({
            product_id: selectedProduct.id,
            name: variant.name,
            description: variant.description,
            cost_price: variant.cost_price,
            sell_price: variant.sell_price,
            stock: variant.stock,
          });

          if (variant.stock && variant.stock > 0) {
            await activitiesAPI.create({
              variant_id: created.id,
              product_id: selectedProduct.id,
              category_id: selectedProduct.category_id,
              product_name: data.name,
              variant_name: variant.name,
              type: "Restock",
              quantity: variant.stock,
              unit_cost: variant.cost_price,
              unit_revenue: 0,
              notes: "Stok awal",
            });
          }
        }
      } else {
        const product = await productsAPI.create({
          name: data.name,
          category_id: data.category_id,
          description: data.description,
        });

        for (const variant of data.variants) {
          const created = await variantsAPI.create({
            product_id: product.id,
            name: variant.name,
            description: variant.description,
            cost_price: variant.cost_price,
            sell_price: variant.sell_price,
            stock: variant.stock,
          });

          if (variant.stock && variant.stock > 0) {
            await activitiesAPI.create({
              variant_id: created.id,
              product_id: product.id,
              category_id: data.category_id,
              product_name: data.name,
              variant_name: variant.name,
              type: "Restock",
              quantity: variant.stock,
              unit_cost: variant.cost_price,
              unit_revenue: 0,
              notes: "Stok awal",
            });
          }
        }
      }

      setFormOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Error saving product:", err);
      alert(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      await productsAPI.delete(selectedProduct.id);
      setDeleteDialogOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Error deleting product:", err);
      alert(err instanceof Error ? err.message : "Gagal menghapus produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStock = (variantId: number) => {
    console.log("Add stock for variant:", variantId);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Error:{" "}
            {error instanceof Error ? error.message : "Terjadi kesalahan"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">Kelola produk dan varian</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat data...</div>
      ) : (
        <ProductTable
          onAddStock={handleAddStock}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        product={selectedProduct || undefined}
        isLoading={isSubmitting}
      />

      <DeleteProductDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        product={selectedProduct}
        isLoading={isSubmitting}
      />
    </div>
  );
}
