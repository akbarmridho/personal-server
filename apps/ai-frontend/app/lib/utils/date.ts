import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

// Jakarta timezone constant
export const JAKARTA_TZ = "Asia/Jakarta";

/**
 * Format date to display format (e.g., "Jan 15, 2025")
 */
export function formatDate(date: string | Date): string {
  return dayjs(date).tz(JAKARTA_TZ).format("dddd, D MMMM YYYY");
}

/**
 * Format datetime to display format (e.g., "Jan 15, 2025 14:30")
 */
export function formatDateTime(date: string | Date): string {
  return dayjs(date).tz(JAKARTA_TZ).format("dddd, D MMMM YYYY HH:mm");
}

/**
 * Format date to short format (e.g., "Jan 15")
 */
export function formatDateShort(date: string | Date): string {
  return dayjs(date).tz(JAKARTA_TZ).format("D MMMM");
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelative(date: string | Date): string {
  return dayjs(date).tz(JAKARTA_TZ).fromNow();
}

/**
 * Convert Date object to ISO date string (YYYY-MM-DD)
 * Used for API communication
 */
export function toISODate(date: Date): string {
  return dayjs(date).tz(JAKARTA_TZ).format("YYYY-MM-DD");
}

/**
 * Convert Date object to ISO datetime string with timezone
 * Used for API communication
 */
export function toISODateTime(date: Date): string {
  return dayjs(date).tz(JAKARTA_TZ).toISOString();
}

/**
 * Get start of day in Jakarta timezone
 */
export function startOfDay(date: Date): Date {
  return dayjs(date).tz(JAKARTA_TZ).startOf("day").toDate();
}

/**
 * Get end of day in Jakarta timezone
 */
export function endOfDay(date: Date): Date {
  return dayjs(date).tz(JAKARTA_TZ).endOf("day").toDate();
}

/**
 * Get date N days ago from today
 */
export function daysAgo(days: number): Date {
  return dayjs().tz(JAKARTA_TZ).subtract(days, "day").toDate();
}

/**
 * Get today's date at start of day
 */
export function today(): Date {
  return dayjs().tz(JAKARTA_TZ).startOf("day").toDate();
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: string | Date): boolean {
  return dayjs(date).isValid();
}
