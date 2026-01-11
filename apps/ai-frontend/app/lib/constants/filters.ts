import type { DocumentType } from "../api/types";
import { daysAgo, today, toISODate } from "../utils/date";

/**
 * Document type options for filter
 */
export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "analysis", label: "Analysis" },
  { value: "filing", label: "Filing" },
  { value: "news", label: "News" },
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
    label: "Yesterday",
    value: "yesterday",
    date_from: toISODate(daysAgo(1)),
    date_to: toISODate(daysAgo(1)),
  },
  {
    label: "Last 7 days",
    value: "7d",
    date_from: toISODate(daysAgo(7)),
    date_to: toISODate(today()),
  },
  {
    label: "Last 14 days",
    value: "14d",
    date_from: toISODate(daysAgo(14)),
    date_to: toISODate(today()),
  },
  {
    label: "Last 30 days",
    value: "30d",
    date_from: toISODate(daysAgo(30)),
    date_to: toISODate(today()),
  },
  {
    label: "Last 3 months",
    value: "90d",
    date_from: toISODate(daysAgo(90)),
    date_to: toISODate(today()),
  },
  {
    label: "Last 6 months",
    value: "180d",
    date_from: toISODate(daysAgo(180)),
    date_to: toISODate(today()),
  },
  {
    label: "Last 1 year",
    value: "365d",
    date_from: toISODate(daysAgo(365)),
    date_to: toISODate(today()),
  },
  {
    label: "Last 2 years",
    value: "730d",
    date_from: toISODate(daysAgo(730)),
    date_to: toISODate(today()),
  },
];

/**
 * Default filter limit for API requests
 */
export const DEFAULT_LIMIT = 20;

/**
 * Search debounce delay (ms)
 */
export const SEARCH_DEBOUNCE_MS = 1000;
