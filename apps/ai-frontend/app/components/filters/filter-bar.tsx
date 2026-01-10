import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { useSubsectors } from "~/hooks/use-subsectors";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import { DOCUMENT_TYPE_OPTIONS } from "~/lib/constants/filters";
import { hasActiveFilters } from "~/lib/utils/url-params";
import { DateFilter } from "./date-filter";
import { FilterBadge } from "./filter-badge";
import { SearchFilter, type SearchFilterRef } from "./search-filter";
import { SubsectorFilter } from "./subsector-filter";
import { TickerFilter } from "./ticker-filter";
import { TypeFilter } from "./type-filter";

interface FilterBarProps {
  showTickerFilter?: boolean;
  showSubsectorFilter?: boolean;
  onSearchChange?: (search: string | undefined) => void;
}

/**
 * Filter bar container with all filter components and active filter display
 */
export function FilterBar({
  showTickerFilter = false,
  showSubsectorFilter = false,
  onSearchChange,
}: FilterBarProps) {
  const { filters, updateFilters, clearFilters, removeFilter } =
    useTimelineFilters();
  const { data: subsectors = [] } = useSubsectors();
  const [searchValue, setSearchValue] = useState<string | undefined>();
  const searchRef = useRef<SearchFilterRef>(null);

  // Handle search change (local state, not URL)
  const handleSearchChange = useCallback(
    (search: string | undefined) => {
      setSearchValue(search);
      onSearchChange?.(search);
    },
    [onSearchChange],
  );

  // Clear search input
  const clearSearch = useCallback(() => {
    searchRef.current?.clear();
    setSearchValue(undefined);
    onSearchChange?.(undefined);
  }, [onSearchChange]);

  const handleDateChange = useCallback(
    (dateRange: { date_from?: string; date_to?: string } | undefined) =>
      updateFilters({
        date_from: dateRange?.date_from,
        date_to: dateRange?.date_to,
      }),
    [updateFilters],
  );

  const handleTypeChange = useCallback(
    (types: any) => updateFilters({ types }),
    [updateFilters],
  );

  const handleSymbolsChange = useCallback(
    (symbols: any) => updateFilters({ symbols }),
    [updateFilters],
  );

  const handleSubsectorsChange = useCallback(
    (subsectors: any) => updateFilters({ subsectors }),
    [updateFilters],
  );

  return (
    <div className="space-y-4">
      {/* Search Input - Full Width */}
      <SearchFilter ref={searchRef} onChange={handleSearchChange} />

      {/* Filter Buttons Row */}
      <div className="flex flex-wrap gap-2">
        {/* Date Filter */}
        <DateFilter
          value={
            filters.date_from || filters.date_to
              ? { date_from: filters.date_from, date_to: filters.date_to }
              : undefined
          }
          onChange={handleDateChange}
        />

        {/* Type Filter */}
        <TypeFilter value={filters.types} onChange={handleTypeChange} />

        {/* Ticker Filter (Ticker Timeline Only) */}
        {showTickerFilter && (
          <TickerFilter
            value={filters.symbols}
            onChange={handleSymbolsChange}
          />
        )}

        {/* Subsector Filter (General Timeline Only) */}
        {showSubsectorFilter && (
          <SubsectorFilter
            value={filters.subsectors}
            onChange={handleSubsectorsChange}
          />
        )}

        {/* Clear All Button */}
        {(hasActiveFilters(filters) || searchValue) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearFilters();
              clearSearch();
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {(hasActiveFilters(filters) || searchValue) && (
        <div className="flex flex-wrap gap-2">
          {/* Search Badge */}
          {searchValue && (
            <FilterBadge
              label="Search"
              value={searchValue}
              onRemove={clearSearch}
            />
          )}

          {/* Date Badge */}
          {(filters.date_from || filters.date_to) && (
            <FilterBadge
              label="Date"
              value={`${filters.date_from || "?"} to ${filters.date_to || "?"}`}
              onRemove={() => {
                updateFilters({ date_from: undefined, date_to: undefined });
              }}
            />
          )}

          {/* Type Badges */}
          {filters.types?.map((type) => (
            <FilterBadge
              key={type}
              label="Type"
              value={
                DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === type)
                  ?.label || type
              }
              onRemove={() =>
                updateFilters({
                  types: filters.types?.filter((t) => t !== type),
                })
              }
            />
          ))}

          {/* Symbol Badges */}
          {filters.symbols?.map((symbol) => (
            <FilterBadge
              key={symbol}
              label="Ticker"
              value={symbol}
              onRemove={() =>
                updateFilters({
                  symbols: filters.symbols?.filter((s) => s !== symbol),
                })
              }
            />
          ))}

          {/* Subsector Badges */}
          {filters.subsectors?.map((subsector) => (
            <FilterBadge
              key={subsector}
              label="Subsector"
              value={
                subsectors.find((opt) => opt.value === subsector)?.label ||
                subsector
              }
              onRemove={() =>
                updateFilters({
                  subsectors: filters.subsectors?.filter(
                    (s) => s !== subsector,
                  ),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
