import { FileQuestion } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

interface EmptyStateProps {
  message?: string;
  description?: string;
}

/**
 * Empty state component for when no timeline items are found
 */
export function EmptyState({
  message = "No documents found",
  description = "Try adjusting your filters or search query",
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{message}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
