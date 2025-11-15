import { createFileRoute } from "@tanstack/react-router";
import { CategoryTable } from "@/components/categories/CategoryTable";

export const Route = createFileRoute("/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <div className="space-y-6">
      <CategoryTable />
    </div>
  );
}
