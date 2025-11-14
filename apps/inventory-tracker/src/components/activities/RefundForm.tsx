import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextarea } from "@/components/forms/FormField";
import { NativeSelectField } from "@/components/forms/NativeSelectField";
import { NumberField } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/date-utils";
import type { RefundFormData } from "@/lib/validations";
import { refundSchema } from "@/lib/validations";
import type { ProductActivityWithRelations } from "@/types/database";

interface RefundFormProps {
  activities: ProductActivityWithRelations[];
  onSubmit: (data: RefundFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function RefundForm({
  activities,
  onSubmit,
  onCancel,
  isSubmitting,
}: RefundFormProps) {
  const [selectedActivityId, setSelectedActivityId] = useState<number>(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RefundFormData>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      original_activity_id: 0,
      quantity: 1,
      notes: "",
    },
  });

  const quantity = watch("quantity");

  // Filter only Sales activities
  const salesActivities = useMemo(
    () => activities.filter((a) => a.type === "Sales"),
    [activities],
  );

  const selectedActivity = useMemo(
    () => salesActivities.find((a) => a.id === selectedActivityId),
    [salesActivities, selectedActivityId],
  );

  const handleActivityChange = (activityId: number) => {
    setSelectedActivityId(activityId);
    setValue("original_activity_id", activityId);
    const activity = salesActivities.find((a) => a.id === activityId);
    if (activity) {
      setValue("quantity", Math.min(1, activity.quantity));
    }
  };

  const refundAmount = selectedActivity
    ? quantity * selectedActivity.unit_revenue +
      (selectedActivity.revenue_adjustment / selectedActivity.quantity) *
        quantity
    : 0;

  const onFormSubmit = async (data: RefundFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting refund:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <NativeSelectField
        label="Transaksi Asli"
        value={selectedActivityId.toString()}
        onChange={(e) => handleActivityChange(Number(e.target.value))}
        error={errors.original_activity_id?.message}
        required
      >
        <option value="0">Pilih transaksi...</option>
        {salesActivities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.product_name} - {activity.variant_name} (
            {activity.quantity} unit) - {formatDateTime(activity.created_at)}
          </option>
        ))}
      </NativeSelectField>

      {selectedActivity && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
          <h4 className="font-medium">Detail Transaksi Asli</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produk:</span>
              <span>{selectedActivity.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Varian:</span>
              <span>{selectedActivity.variant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kuantitas:</span>
              <span>{selectedActivity.quantity} unit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga Satuan:</span>
              <span>{formatCurrency(selectedActivity.unit_revenue)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>
                {formatCurrency(
                  selectedActivity.quantity * selectedActivity.unit_revenue +
                    selectedActivity.revenue_adjustment,
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedActivity && (
        <NumberField
          label="Kuantitas Refund"
          value={quantity}
          onChange={(value) => setValue("quantity", value)}
          error={errors.quantity?.message}
          min={1}
          max={selectedActivity.quantity}
          required
        />
      )}

      <FormTextarea
        label="Alasan Refund"
        {...register("notes")}
        error={errors.notes?.message}
        placeholder="Jelaskan alasan refund..."
        required
      />

      {selectedActivity && (
        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Refund:</span>
            <span className="text-destructive">
              {formatCurrency(refundAmount)}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || !selectedActivity}
          className="flex-1"
          variant="destructive"
        >
          {isSubmitting ? "Memproses..." : "Proses Refund"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
