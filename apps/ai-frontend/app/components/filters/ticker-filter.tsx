import { Building2, Check, Star, X } from "lucide-react";
import MiniSearch from "minisearch";
import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Command,
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
import { cn } from "~/lib/utils";

// Special value for "Stock Universe" filter
const STOCK_UNIVERSE_VALUE = "__STOCK_UNIVERSE__";

interface TickerFilterProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  fullWidth?: boolean;
}

/**
 * Multi-select ticker filter with search combobox
 * Shows all tickers by default with "Stock Universe" as a selectable choice
 */
export function TickerFilter({
  value = [],
  onChange,
  fullWidth = false,
}: TickerFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: companies, isLoading: isLoadingCompanies } = useAllCompanies();
  const { data: stockUniverse } = useStockUniverse();

  const miniSearch = useMemo(() => {
    if (!companies) return null;
    const ms = new MiniSearch({
      fields: ["symbol", "name"],
      storeFields: ["symbol", "name"],
      idField: "symbol",
    });
    ms.addAll(companies);
    return ms;
  }, [companies]);

  // Clear search when popover closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Create a Set for faster lookup of stock universe symbols
  const stockUniverseSet = useMemo(
    () => new Set(stockUniverse?.symbols || []),
    [stockUniverse?.symbols],
  );

  // Check if "Stock Universe" filter is active (all universe symbols are selected)
  const isStockUniverseActive = useMemo(() => {
    if (!stockUniverse?.symbols || stockUniverse.symbols.length === 0)
      return false;
    if (value.length !== stockUniverse.symbols.length) return false;
    // Check if every universe symbol is in the selected values
    return stockUniverse.symbols.every((symbol) => value.includes(symbol));
  }, [value, stockUniverse?.symbols]);

  // No need to filter companies - we show all and mark selected ones

  // Get selected tickers (now just the value array itself)
  const selectedTickers = value;

  // Combined filtering logic using MiniSearch
  const { displayedSelected, displayedAll, showStockUniversePreset } =
    useMemo(() => {
      const searchOptions = {
        boost: { symbol: 2 },
        prefix: true,
        fuzzy: 0.2,
      };

      if (!search.trim() || !miniSearch || !companies) {
        return {
          displayedSelected: selectedTickers,
          displayedAll: (companies || []).filter(
            (c) => !selectedTickers.includes(c.symbol),
          ),
          showStockUniversePreset: true,
        };
      }

      const results = miniSearch.search(search, searchOptions);
      const symbolToScore = new Map(results.map((r) => [r.id, r.score]));

      const displayedSelectedMatches = selectedTickers.filter((s) =>
        symbolToScore.has(s),
      );

      const displayedAllMatches = companies
        .filter(
          (c) =>
            !selectedTickers.includes(c.symbol) && symbolToScore.has(c.symbol),
        )
        .sort(
          (a, b) =>
            (symbolToScore.get(b.symbol) || 0) -
            (symbolToScore.get(a.symbol) || 0),
        );

      const showStockUniversePreset = "stock universe"
        .toLowerCase()
        .includes(search.toLowerCase());

      return {
        displayedSelected: displayedSelectedMatches,
        displayedAll: displayedAllMatches,
        showStockUniversePreset,
      };
    }, [search, miniSearch, selectedTickers, companies]);

  const handleToggle = (symbol: string) => {
    if (symbol === STOCK_UNIVERSE_VALUE) {
      // Toggle Stock Universe filter - set to ALL universe symbols
      const universeSymbols = stockUniverse?.symbols || [];
      const newValue = isStockUniverseActive
        ? undefined // Clear all when toggling off
        : universeSymbols; // Set to all universe symbols when toggling on
      onChange(newValue);
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
    return `${selectedTickers.length} ticker${
      selectedTickers.length > 1 ? "s" : ""
    }`;
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
      <div className={cn("flex gap-1", fullWidth && "w-full")}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("gap-2", fullWidth && "w-full justify-start min-w-0")}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{getButtonLabel()}</span>
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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search tickers by code or name..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoadingCompanies ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                {displayedSelected.length === 0 &&
                  displayedAll.length === 0 &&
                  !showStockUniversePreset && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No tickers found.
                    </div>
                  )}

                {/* Selected Tickers Group */}
                {displayedSelected.length > 0 && (
                  <CommandGroup heading="Selected">
                    {displayedSelected.map((symbol) => {
                      const company = companies?.find(
                        (c) => c.symbol === symbol,
                      );
                      if (!company) return null;
                      return (
                        <CommandItem
                          key={symbol}
                          value={`${symbol} ${company.name}`}
                          onSelect={() => handleToggle(symbol)}
                          className="cursor-pointer"
                        >
                          <Check className="h-4 w-2" />
                          <span className="font-medium">
                            {getDisplayName(company)}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {/* Stock Universe Option */}
                {showStockUniversePreset && (
                  <CommandGroup heading="Presets">
                    <CommandItem
                      value="Stock Universe"
                      onSelect={() => handleToggle(STOCK_UNIVERSE_VALUE)}
                      className="cursor-pointer"
                    >
                      {isStockUniverseActive ? (
                        <Check className="h-4 w-2" />
                      ) : (
                        <div className="h-4 w-2" />
                      )}
                      <Star className="h-4 w-2 text-yellow-500" />
                      <span className="font-medium">Stock Universe</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* All Available Tickers */}
                {displayedAll.length > 0 && (
                  <CommandGroup
                    heading={`All Tickers (${displayedAll.length})`}
                  >
                    {displayedAll.map((company) => (
                      <CommandItem
                        key={company.symbol}
                        value={`${company.symbol} ${company.name}`}
                        onSelect={() => handleToggle(company.symbol)}
                        className="cursor-pointer"
                      >
                        <div className="h-4 w-2" />
                        <span>{getDisplayName(company)}</span>
                        {stockUniverseSet.has(company.symbol) && (
                          <Star className="ml-2 h-3 w-3 text-yellow-500/70" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
