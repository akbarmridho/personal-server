import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { CategoryTable } from "@/components/categories/CategoryTable";
import { DeleteCategoryDialog } from "@/components/categories/DeleteCategoryDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryFormData } from "@/lib/validations";
import type { ProductCategory } from "@/types/database";

export const Route = createFileRoute("/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const {
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);


  const handleEdit = (category: ProductCategory) => {
    setSelectedCategory(category);
    setActionError(null);
    setFormOpen(true);
  };

  const handleDelete = (category: ProductCategory) => {
    setSelectedCategory(category);
    setActionError(null);
    setDeleteOpen(true);
  };

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      setActionError(null);
      if (selectedCategory) {
        await updateCategory(selectedCategory.id, data);
      } else {
        await createCategory(data);
      }
      setFormOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Terjadi kesalahan");
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    try {
      setActionError(null);
      await deleteCategory(selectedCategory.id);
      setDeleteOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  return (
    <div className="space-y-6">

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>
            {error instanceof Error ? error.message : "Gagal memuat kategori"}
          </AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Memuat kategori...
        </div>
      ) : (
        <CategoryTable
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        category={selectedCategory || undefined}
        isSubmitting={isCreating || isUpdating}
      />

      <DeleteCategoryDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        category={selectedCategory}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
