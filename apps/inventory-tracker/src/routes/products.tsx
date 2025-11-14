import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Produk</h1>
      <p className="text-muted-foreground">Halaman manajemen produk dan varian</p>
    </div>
  );
}
