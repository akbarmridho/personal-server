import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dateToFormatted = (date: Date) => {
  return dayjs(date).tz("Asia/Jakarta").format("YYYY-MM-DD");
};

/**
 * Recursively deletes one or more specified keys from an object or an array.
 * This function mutates the original object/array.
 *
 * @param {object|array} data - The input object or array to modify.
 * @param {string|string[]} keysToDelete - A single key or an array of keys to delete.
 */
export function removeKeysRecursive(
  data: any,
  keysToDelete: string[] | string,
) {
  // Ensure keysToDelete is always an array for consistent checking
  const keys = Array.isArray(keysToDelete) ? keysToDelete : [keysToDelete];

  // If data is an array, iterate over each item and call recursively
  if (Array.isArray(data)) {
    // biome-ignore lint/suspicious/useIterableCallbackReturn: stfu
    data.forEach((item) => removeKeysRecursive(item, keys));
  }
  // If data is a plain object (and not null)
  else if (data && typeof data === "object") {
    // Iterate over the keys of the object
    Object.keys(data).forEach((key) => {
      // Check if the current key is one we want to delete
      if (keys.includes(key)) {
        delete data[key];
      }
      // If the key is not deleted, check if its value is an object/array
      // and recurse into it.
      else {
        removeKeysRecursive(data[key], keys);
      }
    });
  }

  // Return the modified data (though it was mutated in place)
  return data;
}
