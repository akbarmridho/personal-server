import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Kategori</h1>
      <p className="text-muted-foreground">Halaman manajemen kategori produk</p>
    </div>
  );
}
