import type { FilterParams, SearchParams } from "../api/types";

/**
 * React Query key factory for consistent cache management
 */
export const queryKeys = {
  // Timeline queries
  timeline: {
    all: ["timeline"] as const,
    lists: () => [...queryKeys.timeline.all, "list"] as const,
    list: (filters: FilterParams) =>
      [...queryKeys.timeline.lists(), filters] as const,
    searches: () => [...queryKeys.timeline.all, "search"] as const,
    search: (params: SearchParams) =>
      [...queryKeys.timeline.searches(), params] as const,
  },

  // Document queries
  document: {
    all: ["document"] as const,
    details: () => [...queryKeys.document.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.document.details(), id] as const,
  },

  // Stock universe
  stockUniverse: {
    all: ["stock-universe"] as const,
    list: () => [...queryKeys.stockUniverse.all, "list"] as const,
  },

  // All companies
  allCompanies: {
    all: ["all-companies"] as const,
    list: () => [...queryKeys.allCompanies.all, "list"] as const,
  },
} as const;
