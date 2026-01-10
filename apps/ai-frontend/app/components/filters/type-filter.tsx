import { FileType, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { DocumentType } from "~/lib/api/types";
import { DOCUMENT_TYPE_OPTIONS } from "~/lib/constants/filters";

interface TypeFilterProps {
  value?: DocumentType[];
  onChange: (value: DocumentType[] | undefined) => void;
}

/**
 * Multi-select type filter
 */
export function TypeFilter({ value = [], onChange }: TypeFilterProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (type: DocumentType) => {
    const newValue = value.includes(type)
      ? value.filter((t) => t !== type)
      : [...value, type];

    onChange(newValue.length > 0 ? newValue : undefined);
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const getButtonLabel = () => {
    if (!value.length) {
      return "Type";
    }
    if (value.length === 1) {
      return (
        DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === value[0])?.label ||
        value[0]
      );
    }
    return `${value.length} types`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1">
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileType className="h-4 w-4" />
            {getButtonLabel()}
          </Button>
        </PopoverTrigger>
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Clear type filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <PopoverContent className="w-56" align="start">
        <div className="space-y-2">
          <div className="text-sm font-medium mb-3">Document Types</div>
          {DOCUMENT_TYPE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
              onClick={() => handleToggle(option.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle(option.value);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Checkbox
                id={`type-${option.value}`}
                checked={value.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
              />
              <label
                htmlFor={`type-${option.value}`}
                className="text-sm cursor-pointer flex-1"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
