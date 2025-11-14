import { Link } from "@tanstack/react-router";
import { AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LowStockAlert } from "@/types/api";

interface LowStockListProps {
  data: LowStockAlert[];
}

export function LowStockList({ data }: LowStockListProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peringatan Stok Rendah</CardTitle>
          <CardDescription>Produk dengan stok di bawah minimum</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Semua produk memiliki stok yang cukup
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Peringatan Stok Rendah
        </CardTitle>
        <CardDescription>
          {data.length} produk memerlukan restock
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.variant_id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex-1">
                <div className="font-medium">{item.product_name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.variant_name} • {item.category_name}
                </div>
                <div className="text-sm mt-1">
                  <span className="text-destructive font-medium">
                    Stok: {item.current_stock}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    / Min: {item.min_stock_level}
                  </span>
                </div>
              </div>
              <Link to="/activities">
                <Button size="sm" variant="outline">
                  Restock
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
