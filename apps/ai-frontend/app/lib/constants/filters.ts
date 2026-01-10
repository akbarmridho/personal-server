import type { DocumentType } from "../api/types";
import { daysAgo, today, toISODate } from "../utils/date";

/**
 * Document type options for filter
 */
export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "news", label: "News" },
  { value: "filing", label: "Filing" },
  { value: "analysis", label: "Analysis" },
  { value: "rumour", label: "Rumour" },
];

/**
 * Date range presets
 */
export interface DatePreset {
  label: string;
  value: string;
  date_from: string;
  date_to: string;
}

export const DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    value: "today",
    date_from: toISODate(today()),
    date_to: toISODate(today()),
  },
  {
    label: "Last 7 days",
    value: "7d",
    date_from: toISODate(daysAgo(7)),
    date_to: toISODate(today()),
  },
  {
    label: "Last 30 days",
    value: "30d",
    date_from: toISODate(daysAgo(30)),
    date_to: toISODate(today()),
  },
];

/**
 * Subsector options for general timeline filter
 * Based on Indonesian stock market subsectors
 */
export const SUBSECTOR_OPTIONS: { value: string; label: string }[] = [
  { value: "financials", label: "Financials" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "energy", label: "Energy" },
  { value: "basic_materials", label: "Basic Materials" },
  { value: "consumer_cyclicals", label: "Consumer Cyclicals" },
  { value: "consumer_non_cyclicals", label: "Consumer Non-Cyclicals" },
  { value: "healthcare", label: "Healthcare" },
  { value: "industrials", label: "Industrials" },
  { value: "properties_real_estate", label: "Properties & Real Estate" },
  { value: "technology", label: "Technology" },
  { value: "transportation_logistics", label: "Transportation & Logistics" },
];

/**
 * Default filter limit for API requests
 */
export const DEFAULT_LIMIT = 20;

/**
 * Search debounce delay (ms)
 */
export const SEARCH_DEBOUNCE_MS = 300;
