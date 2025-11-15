import { createFileRoute } from "@tanstack/react-router";
import { ProductTable } from "@/components/products/ProductTable";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <div className="space-y-3">
      <ProductTable />
    </div>
  );
}