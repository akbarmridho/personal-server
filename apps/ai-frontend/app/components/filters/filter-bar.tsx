import { X } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "~/components/ui/button";
import { useSubsectors } from "~/hooks/use-subsectors";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { DocumentType } from "~/lib/api/types";
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
  compact?: boolean;
}

/**
 * Filter bar container with all filter components and active filter display
 */
export function FilterBar({
  showTickerFilter = false,
  showSubsectorFilter = false,
  compact = false,
}: FilterBarProps) {
  const { filters, updateFilters, clearFilters } = useTimelineFilters();
  const { data: subsectors = [] } = useSubsectors();
  const searchRef = useRef<SearchFilterRef>(null);

  // Handle search change (sync to URL)
  const handleSearchChange = useCallback(
    (search: string | undefined) => {
      updateFilters({ search });
    },
    [updateFilters],
  );

  // Clear search input
  const clearSearch = useCallback(() => {
    searchRef.current?.clear();
    updateFilters({ search: undefined });
  }, [updateFilters]);

  const handleDateChange = useCallback(
    (dateRange: { date_from?: string; date_to?: string } | undefined) =>
      updateFilters({
        date_from: dateRange?.date_from,
        date_to: dateRange?.date_to,
      }),
    [updateFilters],
  );

  const handleTypeChange = useCallback(
    (types: DocumentType[] | undefined) => updateFilters({ types }),
    [updateFilters],
  );

  const handleSymbolsChange = useCallback(
    (symbols: string[] | undefined) => updateFilters({ symbols }),
    [updateFilters],
  );

  const handleSubsectorsChange = useCallback(
    (subsectors: string[] | undefined) => updateFilters({ subsectors }),
    [updateFilters],
  );

  const containerClasses = compact
    ? "space-y-4 w-full"
    : "sticky top-[7.5rem] z-40 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 bg-background/80 backdrop-blur-md border-b border-border/40 transition-all duration-200 supports-[backdrop-filter]:bg-background/60 space-y-3 mb-6";

  const contentClasses = compact ? "space-y-4" : "max-w-4xl mx-auto space-y-3";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Search Input */}
        <SearchFilter
          ref={searchRef}
          value={filters.search}
          onChange={handleSearchChange}
        />

        {/* Filter Buttons Row */}
        <div className={`flex flex-wrap gap-2 ${compact ? "flex-col" : ""}`}>
          {/* Date Filter */}
          <div className={compact ? "w-full" : ""}>
            <DateFilter
              value={
                filters.date_from || filters.date_to
                  ? { date_from: filters.date_from, date_to: filters.date_to }
                  : undefined
              }
              onChange={handleDateChange}
              fullWidth={compact}
            />
          </div>

          {/* Type Filter */}
          <div className={compact ? "w-full" : ""}>
            <TypeFilter
              value={filters.types}
              onChange={handleTypeChange}
              fullWidth={compact}
            />
          </div>

          {/* Ticker Filter (Ticker Timeline Only) */}
          {showTickerFilter && (
            <div className={compact ? "w-full" : ""}>
              <TickerFilter
                value={filters.symbols}
                onChange={handleSymbolsChange}
                fullWidth={compact}
              />
            </div>
          )}

          {/* Subsector Filter (General Timeline Only) */}
          {showSubsectorFilter && (
            <div className={compact ? "w-full" : ""}>
              <SubsectorFilter
                value={filters.subsectors}
                onChange={handleSubsectorsChange}
                fullWidth={compact}
              />
            </div>
          )}

          {/* Clear All Button */}
          {hasActiveFilters(filters) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearFilters();
                searchRef.current?.clear();
              }}
              className={`gap-2 h-9 px-3 ${compact ? "w-full justify-start" : ""}`}
            >
              <X className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters(filters) && (
          <div className="flex flex-wrap gap-2 pt-1 max-w-full overflow-hidden">
            {/* Search Badge */}
            {filters.search && (
              <FilterBadge
                label="Search"
                value={filters.search}
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
    </div>
  );
}
