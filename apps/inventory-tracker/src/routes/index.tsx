import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Halaman analitik dan ringkasan inventori</p>
    </div>
  );
}
