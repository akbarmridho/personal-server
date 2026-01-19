import { Database, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useSources } from "~/hooks/use-sources";
import { cn, formatHyphenatedText } from "~/lib/utils";

interface SourceFilterProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  fullWidth?: boolean;
}

/**
 * Multi-select source filter
 */
export function SourceFilter({
  value = [],
  onChange,
  fullWidth = false,
}: SourceFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: sources = [], isLoading } = useSources();

  const handleToggle = (source: string) => {
    const newValue = value.includes(source)
      ? value.filter((s) => s !== source)
      : [...value, source];

    onChange(newValue.length > 0 ? newValue : undefined);
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const getButtonLabel = () => {
    if (!value.length) {
      return "Source";
    }
    if (value.length === 1) {
      return formatHyphenatedText(value[0]);
    }
    return `${value.length} sources`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <div className={cn("flex gap-1", fullWidth && "w-full")}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("gap-2", fullWidth && "w-full justify-start min-w-0")}
          >
            <Database className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{getButtonLabel()}</span>
          </Button>
        </PopoverTrigger>
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Clear source filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <PopoverContent className="w-56 p-3" align="start">
        <div className="text-sm font-medium mb-1.5">Sources</div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-1.5">
            Loading sources...
          </div>
        ) : sources.length === 0 ? (
          <div className="text-sm text-muted-foreground p-1.5">
            No sources available
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {[...sources].sort().map((source) => (
              <div
                key={source}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-1.5 rounded"
                onClick={() => handleToggle(source)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(source);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <Checkbox
                  id={`source-${source}`}
                  checked={value.includes(source)}
                  onCheckedChange={() => handleToggle(source)}
                />
                <label
                  htmlFor={`source-${source}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {formatHyphenatedText(source)}
                </label>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
