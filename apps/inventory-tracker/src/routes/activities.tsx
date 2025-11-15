import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ActivityTable } from "@/components/activities/ActivityTable";
import { RefundForm } from "@/components/activities/RefundForm";
import { TransactionForm } from "@/components/activities/TransactionForm";
import { Button } from "@/components/ui/button";
import { useActivities } from "@/hooks/useActivities";
import { useProducts } from "@/hooks/useProducts";
import { transactionsAPI, variantsAPI } from "@/lib/api";
import type {
  RefundFormData,
  TransactionWithActivitiesFormData,
} from "@/lib/validations";
import type { ActivityType } from "@/types/database";

export const Route = createFileRoute("/activities")({
  component: ActivitiesPage,
});

type FormType = "transaction" | "refund" | "adjustment" | null;

function ActivitiesPage() {
  const [activeForm, setActiveForm] = useState<FormType>(null);
  const { activities, isLoading, createBatchActivities } = useActivities();
  const { products } = useProducts();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTransactionSubmit = async (
    data: TransactionWithActivitiesFormData,
  ) => {
    setIsSubmitting(true);
    try {
      // Create transaction first
      const transaction = await transactionsAPI.create({
        notes: data.notes,
      });

      // Get variant details for each activity
      const activitiesData = await Promise.all(
        data.activities.map(async (item) => {
          const variant = await variantsAPI.getById(item.variant_id);
          const product = products.find((p) => p.id === variant.product_id);

          return {
            transaction_id: transaction.id,
            product_id: variant.product_id,
            variant_id: variant.id,
            category_id: product?.category_id || undefined,
            product_name: product?.name || "",
            variant_name: variant.name,
            type: "Sales" as ActivityType,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            unit_revenue: item.unit_revenue,
            cost_adjustment: 0,
            revenue_adjustment: item.revenue_adjustment,
          };
        }),
      );

      await createBatchActivities(activitiesData);
      setActiveForm(null);
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Gagal menyimpan transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefundSubmit = async (data: RefundFormData) => {
    setIsSubmitting(true);
    try {
      const originalActivity = activities.find(
        (a) => a.id === data.original_activity_id,
      );
      if (!originalActivity) throw new Error("Aktivitas tidak ditemukan");

      // Calculate refund amount proportionally
      const refundRatio = data.quantity / originalActivity.quantity;
      const revenueAdjustment = Math.round(
        originalActivity.revenue_adjustment * refundRatio,
      );

      await createBatchActivities([
        {
          transaction_id: originalActivity.transaction_id || undefined,
          product_id: originalActivity.product_id || undefined,
          variant_id: originalActivity.variant_id || undefined,
          category_id: originalActivity.category_id || undefined,
          product_name: originalActivity.product_name,
          variant_name: originalActivity.variant_name,
          type: "Refund" as ActivityType,
          quantity: data.quantity,
          unit_cost: originalActivity.unit_cost,
          unit_revenue: originalActivity.unit_revenue,
          cost_adjustment: 0,
          revenue_adjustment: revenueAdjustment,
          notes: data.notes,
        },
      ]);
      setActiveForm(null);
    } catch (error) {
      console.error("Error creating refund:", error);
      alert("Gagal memproses refund");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Riwayat transaksi dan aktivitas stok
          </p>
        </div>
        {!activeForm && (
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveForm("transaction")}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Transaksi Penjualan
            </Button>
            <Button
              onClick={() => setActiveForm("refund")}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Refund
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <ActivityTable isLoading={isLoading} />
        </div>

        {/* Sidebar Forms */}
        {activeForm && (
          <div className="lg:w-96 space-y-4">

            {activeForm === "transaction" && (
              <div className="border rounded-lg p-4 bg-card">
                <h2 className="font-semibold mb-4">Transaksi Penjualan</h2>
                <TransactionForm
                  products={products}
                  onSubmit={handleTransactionSubmit}
                  onCancel={() => setActiveForm(null)}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {activeForm === "refund" && (
              <div className="border rounded-lg p-4 bg-card">
                <h2 className="font-semibold mb-4">Refund</h2>
                <RefundForm
                  activities={activities}
                  onSubmit={handleRefundSubmit}
                  onCancel={() => setActiveForm(null)}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}