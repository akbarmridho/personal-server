import dayjs from "dayjs";
import "dayjs/locale/id.js";
import advancedFormat from "dayjs/plugin/advancedFormat.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import localeData from "dayjs/plugin/localeData.js";

// Extend dayjs with the plugins
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(localeData);

/**
 * Converts a date string in "D MMMM YYYY" format (e.g., "30 Oktober 2025" or "30 October 2025")
 * to the ISO standard format "YYYY-MM-DD".
 *
 * It attempts to parse the date using the Indonesian ('id') locale first, then falls back to default English.
 *
 * @param dateString The date string to convert.
 * @returns The date string in "YYYY-MM-DD" format.
 */
export function extractDate(dateString: string): string {
  // Define the expected input format: Day (D), Full Month Name (MMMM), Full Year (YYYY)
  const format = "D MMMM YYYY";

  // 1. Attempt to parse using Indonesian locale ('id')
  let date = dayjs(dateString, format, "id");

  // 2. If parsing failed, try again with default locale (usually English)
  if (!date.isValid()) {
    date = dayjs(dateString, format);
  }

  // 3. Check if the date is valid after all attempts
  if (!date.isValid()) {
    throw new Error(`Cannot format date: Invalid date string "${dateString}"`);
  }

  // 4. Format the valid date to the desired ISO output format
  return date.format("YYYY-MM-DD");
}
