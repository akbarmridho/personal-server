import { Building2, Check, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useAllCompanies, useStockUniverse } from "~/hooks/use-stock-universe";
import type { Company } from "~/lib/api/types";

// Special value for "Stock Universe" filter
const STOCK_UNIVERSE_VALUE = "__STOCK_UNIVERSE__";

interface TickerFilterProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
}

/**
 * Multi-select ticker filter with search combobox
 * Shows all tickers by default with "Stock Universe" as a selectable choice
 */
export function TickerFilter({ value = [], onChange }: TickerFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: companies, isLoading: isLoadingCompanies } = useAllCompanies();
  const { data: stockUniverse } = useStockUniverse();

  // Create a Set for faster lookup of stock universe symbols
  const stockUniverseSet = useMemo(
    () => new Set(stockUniverse?.symbols || []),
    [stockUniverse?.symbols],
  );

  // Check if "Stock Universe" filter is active
  const isStockUniverseActive = value.includes(STOCK_UNIVERSE_VALUE);

  // Filter companies based on active filters
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];

    // If Stock Universe is selected, filter to only show universe symbols
    if (isStockUniverseActive) {
      return companies.filter((c) => stockUniverseSet.has(c.symbol));
    }

    return companies;
  }, [companies, isStockUniverseActive, stockUniverseSet]);

  // Get selected tickers (excluding the special Stock Universe value)
  const selectedTickers = useMemo(
    () => value.filter((v) => v !== STOCK_UNIVERSE_VALUE),
    [value],
  );

  const handleToggle = (symbol: string) => {
    if (symbol === STOCK_UNIVERSE_VALUE) {
      // Toggle Stock Universe filter
      const newValue = isStockUniverseActive
        ? value.filter((v) => v !== STOCK_UNIVERSE_VALUE)
        : [...value, STOCK_UNIVERSE_VALUE];
      onChange(newValue.length > 0 ? newValue : undefined);
      return;
    }

    // Regular ticker toggle
    const newValue = value.includes(symbol)
      ? value.filter((s) => s !== symbol)
      : [...value, symbol];

    onChange(newValue.length > 0 ? newValue : undefined);
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const getButtonLabel = () => {
    if (isStockUniverseActive && selectedTickers.length === 0) {
      return "Stock Universe";
    }
    if (!selectedTickers.length) {
      return "Ticker";
    }
    if (selectedTickers.length === 1) {
      return selectedTickers[0];
    }
    return `${selectedTickers.length} ticker${selectedTickers.length > 1 ? "s" : ""}`;
  };

  // Get display name for a company or the Stock Universe option
  const getDisplayName = (
    item: Company | { value: string; isStockUniverse: true },
  ): string => {
    if ("isStockUniverse" in item) {
      return "Stock Universe";
    }
    return `${item.symbol} - ${item.name}`;
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

      <PopoverContent className="w-[350px] p-0" align="start">
        <Command
          filter={(value, search) => {
            // Custom filter to search both symbol and company name
            const item = filteredCompanies.find(
              (c) => `${c.symbol} - ${c.name}` === value,
            );
            if (item) {
              const searchLower = search.toLowerCase();
              const symbolMatch = item.symbol
                .toLowerCase()
                .includes(searchLower);
              const nameMatch = item.name.toLowerCase().includes(searchLower);
              return symbolMatch || nameMatch ? 1 : 0;
            }
            // Filter for Stock Universe option
            if (value === "Stock Universe") {
              return search.toLowerCase().includes("stock") ||
                search.toLowerCase().includes("universe")
                ? 1
                : 0;
            }
            return 0;
          }}
        >
          <CommandInput placeholder="Search tickers by code or name..." />
          <CommandList>
            {isLoadingCompanies ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty>No tickers found.</CommandEmpty>

                {/* Selected Tickers Group */}
                {selectedTickers.length > 0 && (
                  <CommandGroup heading="Selected">
                    {selectedTickers.map((symbol) => {
                      const company = companies?.find(
                        (c) => c.symbol === symbol,
                      );
                      if (!company) return null;
                      return (
                        <CommandItem
                          key={symbol}
                          value={`${symbol} - ${company.name}`}
                          onSelect={() => handleToggle(symbol)}
                          className="cursor-pointer"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          <span className="font-medium">
                            {getDisplayName(company)}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {/* Stock Universe Option */}
                <CommandGroup heading="Presets">
                  <CommandItem
                    value="Stock Universe"
                    onSelect={() => handleToggle(STOCK_UNIVERSE_VALUE)}
                    className="cursor-pointer"
                  >
                    {isStockUniverseActive ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <div className="mr-2 h-4 w-4" />
                    )}
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Stock Universe</span>
                  </CommandItem>
                </CommandGroup>

                {/* All Available Tickers */}
                <CommandGroup
                  heading={`All Tickers (${filteredCompanies.length})`}
                >
                  {filteredCompanies
                    .filter((c) => !selectedTickers.includes(c.symbol))
                    .slice(0, 200)
                    .map((company) => (
                      <CommandItem
                        key={company.symbol}
                        value={`${company.symbol} - ${company.name}`}
                        onSelect={() => handleToggle(company.symbol)}
                        className="cursor-pointer"
                      >
                        <div className="mr-2 h-4 w-4" />
                        <span>{getDisplayName(company)}</span>
                        {stockUniverseSet.has(company.symbol) && (
                          <Star className="ml-2 h-3 w-3 text-yellow-500/70" />
                        )}
                      </CommandItem>
                    ))}
                  {filteredCompanies.filter(
                    (c) => !selectedTickers.includes(c.symbol),
                  ).length > 200 && (
                    <CommandItem disabled className="cursor-default">
                      <span className="text-sm text-muted-foreground">
                        ...and{" "}
                        {filteredCompanies.filter(
                          (c) => !selectedTickers.includes(c.symbol),
                        ).length - 200}{" "}
                        more (use search to find specific tickers)
                      </span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
