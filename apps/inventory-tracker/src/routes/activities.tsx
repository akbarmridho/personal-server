import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/activities")({
  component: ActivitiesPage,
});

function ActivitiesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Aktivitas</h1>
      <p className="text-muted-foreground">Halaman riwayat transaksi dan aktivitas stok</p>
    </div>
  );
}
