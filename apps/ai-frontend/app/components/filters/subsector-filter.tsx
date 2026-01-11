import { Layers, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useSubsectors } from "~/hooks/use-subsectors";

interface SubsectorFilterProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
}

/**
 * Multi-select subsector filter (for general timeline)
 */
export function SubsectorFilter({
  value = [],
  onChange,
}: SubsectorFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: subsectors = [], isLoading } = useSubsectors();

  const handleToggle = (subsector: string) => {
    const newValue = value.includes(subsector)
      ? value.filter((s) => s !== subsector)
      : [...value, subsector];

    onChange(newValue.length > 0 ? newValue : undefined);
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const getButtonLabel = () => {
    if (!value.length) {
      return "Subsector";
    }
    if (value.length === 1) {
      return (
        subsectors.find((opt) => opt.value === value[0])?.label || value[0]
      );
    }
    return `${value.length} subsectors`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1">
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
            {getButtonLabel()}
          </Button>
        </PopoverTrigger>
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Clear subsector filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <div className="text-sm font-medium mb-3">Subsectors</div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && subsectors.length === 0 && (
                <div className="text-sm text-center py-8 text-muted-foreground">
                  No subsectors found
                </div>
              )}
              {subsectors.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                  onClick={() => handleToggle(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggle(option.value);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <Checkbox
                    id={`subsector-${option.value}`}
                    checked={value.includes(option.value)}
                    onCheckedChange={() => handleToggle(option.value)}
                  />
                  <label
                    htmlFor={`subsector-${option.value}`}
                    className="text-sm cursor-pointer flex-1 capitalize"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
