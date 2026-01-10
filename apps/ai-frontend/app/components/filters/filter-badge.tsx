import { X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface FilterBadgeProps {
  label: string;
  value: string;
  onRemove: () => void;
}

/**
 * Removable filter chip showing active filter
 */
export function FilterBadge({ label, value, onRemove }: FilterBadgeProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span className="text-xs">
        <span className="font-medium">{label}:</span> {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 hover:bg-transparent"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}
