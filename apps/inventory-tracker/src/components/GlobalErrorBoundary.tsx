import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GlobalErrorBoundaryProps {
  error: Error;
  reset?: () => void;
}

export function GlobalErrorBoundary({ error, reset }: GlobalErrorBoundaryProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Terjadi Kesalahan</CardTitle>
          <CardDescription>
            Aplikasi mengalami masalah yang tidak terduga. Silakan coba lagi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium text-red-600 mb-2">
                Detail Error (Development):
              </p>
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {error?.toString()}
              </pre>
            </div>
          )}
          <div className="flex gap-2">
            {reset && (
              <Button
                onClick={reset}
                variant="outline"
                className="flex-1"
              >
                Coba Lagi
              </Button>
            )}
            <Button onClick={handleReload} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}