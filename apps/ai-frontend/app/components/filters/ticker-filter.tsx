import { Building2, Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { useStockUniverse } from "~/hooks/use-stock-universe";

interface TickerFilterProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
}

/**
 * Multi-select ticker filter with search combobox
 */
export function TickerFilter({ value = [], onChange }: TickerFilterProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useStockUniverse();

  const handleToggle = (symbol: string) => {
    const newValue = value.includes(symbol)
      ? value.filter((s) => s !== symbol)
      : [...value, symbol];

    onChange(newValue.length > 0 ? newValue : undefined);
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const getButtonLabel = () => {
    if (!value.length) {
      return "Ticker";
    }
    if (value.length === 1) {
      return value[0];
    }
    return `${value.length} tickers`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1">
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Building2 className="h-4 w-4" />
            {getButtonLabel()}
          </Button>
        </PopoverTrigger>
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Clear ticker filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tickers..." />
          <CommandList>
            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty>No tickers found.</CommandEmpty>
                {value.length > 0 && (
                  <CommandGroup heading="Selected">
                    {value.map((symbol) => (
                      <CommandItem
                        key={symbol}
                        onSelect={() => handleToggle(symbol)}
                        className="cursor-pointer"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        <span className="font-medium">{symbol}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading="Available Tickers">
                  {data?.symbols
                    .filter((symbol) => !value.includes(symbol))
                    .map((symbol) => (
                      <CommandItem
                        key={symbol}
                        onSelect={() => handleToggle(symbol)}
                        className="cursor-pointer"
                      >
                        <div className="mr-2 h-4 w-4" />
                        <span>{symbol}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
