import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/date-utils";
import type { ProductActivityWithRelations } from "@/types/database";

interface ActivityTableProps {
  activities: ProductActivityWithRelations[];
  isLoading: boolean;
}

interface GroupedActivities {
  [key: string]: ProductActivityWithRelations[];
}

export function ActivityTable({ activities, isLoading }: ActivityTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group activities by transaction_id
  const groupedActivities: GroupedActivities = activities.reduce(
    (acc, activity) => {
      const key = activity.transaction_id
        ? `tx-${activity.transaction_id}`
        : `single-${activity.id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    },
    {} as GroupedActivities,
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Memuat data...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Belum ada aktivitas
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(groupedActivities).map(([key, groupActivities]) => {
        const isExpanded = expandedGroups.has(key);
        const isGroup = groupActivities.length > 1;
        const firstActivity = groupActivities[0];
        const totalValue = groupActivities.reduce(
          (sum, a) =>
            sum +
            (a.type === "Sales"
              ? a.quantity * a.unit_revenue + a.revenue_adjustment
              : a.quantity * a.unit_cost + a.cost_adjustment),
          0,
        );

        return (
          <div key={key} className="border rounded-lg overflow-hidden bg-card">
            {/* Group Header */}
            <div
              className={`p-4 ${isGroup ? "cursor-pointer hover:bg-muted/50" : ""}`}
              onClick={() => isGroup && toggleGroup(key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {isGroup && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {isGroup
                          ? `Transaksi #${firstActivity.transaction_id}`
                          : firstActivity.product_name}
                      </span>
                      {!isGroup && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {firstActivity.variant_name}
                          </span>
                        </>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          firstActivity.type === "Sales"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : firstActivity.type === "Restock"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : firstActivity.type === "Refund"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}
                      >
                        {ACTIVITY_TYPE_LABELS[firstActivity.type]}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDateTime(firstActivity.created_at)}
                      {isGroup && (
                        <span className="ml-2">
                          • {groupActivities.length} item
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(totalValue)}
                  </div>
                  {!isGroup && (
                    <div className="text-sm text-muted-foreground">
                      {firstActivity.quantity} unit
                    </div>
                  )}
                </div>
              </div>
              {firstActivity.transactions?.notes && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {firstActivity.transactions.notes}
                </div>
              )}
            </div>

            {/* Expanded Group Details */}
            {isGroup && isExpanded && (
              <div className="border-t bg-muted/30">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left p-3 font-medium">Produk</th>
                      <th className="text-left p-3 font-medium">Varian</th>
                      <th className="text-right p-3 font-medium">Qty</th>
                      <th className="text-right p-3 font-medium">Harga</th>
                      <th className="text-right p-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupActivities.map((activity) => {
                      const itemTotal =
                        activity.type === "Sales"
                          ? activity.quantity * activity.unit_revenue +
                            activity.revenue_adjustment
                          : activity.quantity * activity.unit_cost +
                            activity.cost_adjustment;

                      return (
                        <tr key={activity.id} className="border-t text-sm">
                          <td className="p-3">{activity.product_name}</td>
                          <td className="p-3 text-muted-foreground">
                            {activity.variant_name}
                          </td>
                          <td className="p-3 text-right">
                            {activity.quantity}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(
                              activity.type === "Sales"
                                ? activity.unit_revenue
                                : activity.unit_cost,
                            )}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(itemTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
