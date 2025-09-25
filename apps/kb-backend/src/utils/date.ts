import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

export function parseDate(input: string): Date | null {
  // Define the formats you expect
  const formats = [
    "YYYY-MM-DD", // ISO short date
    "YYYY-MM-DDTHH:mm:ssZ", // ISO full datetime
    "MM/DD/YYYY", // US style
    "DD-MM-YYYY", // European style
    "DD/MM/YYYY", // Another common style
  ];

  for (const fmt of formats) {
    const parsed = dayjs(input, fmt, true); // true = strict mode
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  return null; // nothing matched
}
