import { Calendar, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "~/components/ui/button";
import { Calendar as CalendarComponent } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { DATE_PRESETS } from "~/lib/constants/filters";
import { cn } from "~/lib/utils";
import { toISODate } from "~/lib/utils/date";

interface DateFilterProps {
  value?: { date_from?: string; date_to?: string };
  onChange: (
    value: { date_from?: string; date_to?: string } | undefined,
  ) => void;
  fullWidth?: boolean;
}

/**
 * Date filter with presets and custom date range picker
 */
export function DateFilter({
  value,
  onChange,
  fullWidth = false,
}: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (value?.date_from && value?.date_to) {
      return {
        from: new Date(value.date_from),
        to: new Date(value.date_to),
      };
    }
    return undefined;
  });

  const handlePresetClick = (preset: (typeof DATE_PRESETS)[number]) => {
    onChange({
      date_from: preset.date_from,
      date_to: preset.date_to,
    });
    setOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onChange({
        date_from: toISODate(range.from),
        date_to: toISODate(range.to),
      });
      setOpen(false);
    }
  };

  const handleClear = () => {
    setDateRange(undefined);
    onChange(undefined);
  };

  const getButtonLabel = () => {
    if (!value?.date_from || !value?.date_to) {
      return "Date";
    }

    // Check if matches a preset
    const matchingPreset = DATE_PRESETS.find(
      (p) => p.date_from === value.date_from && p.date_to === value.date_to,
    );

    if (matchingPreset) {
      return matchingPreset.label;
    }

    // Custom range
    return `${value.date_from} to ${value.date_to}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <div className={cn("flex gap-1", fullWidth && "w-full")}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("gap-2", fullWidth && "w-full justify-start min-w-0")}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{getButtonLabel()}</span>
          </Button>
        </PopoverTrigger>
        {value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Clear date filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets */}
          <div className="border-r p-3 space-y-1 max-w-48">
            <div className="text-sm font-medium mb-2">Presets</div>
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <div className="text-sm font-medium mb-2">Custom Range</div>
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={handleRangeSelect}
              numberOfMonths={1}
              className="rounded-md"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
