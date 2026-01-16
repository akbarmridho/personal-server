import { Check, CheckCircle2, Eye, EyeOff, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import type { ReadStatusFilter as ReadStatusFilterType } from "~/lib/utils/url-params";

interface ReadStatusFilterOption {
  value: ReadStatusFilterType;
  label: string;
  icon: React.ReactNode;
}

interface ReadStatusFilterProps {
  value: ReadStatusFilterType;
  onChange: (value: ReadStatusFilterType) => void;
  fullWidth?: boolean;
}

const READ_STATUS_OPTIONS: ReadStatusFilterOption[] = [
  {
    value: "all",
    label: "All Articles",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    value: "read",
    label: "Read Only",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    value: "unread",
    label: "Unread Only",
    icon: <EyeOff className="h-4 w-4" />,
  },
];

/**
 * Read status filter for golden article timeline
 * Allows filtering by all/read/unread articles
 */
export function ReadStatusFilter({
  value,
  onChange,
  fullWidth = false,
}: ReadStatusFilterProps) {
  const [open, setOpen] = useState(false);

  const currentOption =
    READ_STATUS_OPTIONS.find((opt) => opt.value === value) ||
    READ_STATUS_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("gap-2", fullWidth && "w-full justify-start min-w-0")}
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {currentOption.label}
            </span>
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent className="w-56 p-1.5" align="start">
        <div className="text-xs font-medium px-2 py-1.5 text-muted-foreground">
          Read Status
        </div>
        <div className="space-y-1">
          {READ_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                value === option.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground text-foreground",
              )}
            >
              {option.icon}
              <span className="flex-1 text-left">{option.label}</span>
              {value === option.value && <Check className="h-4 w-4 ml-auto" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
