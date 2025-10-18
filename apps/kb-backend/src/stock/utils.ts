/**
 * Function wrapper that adds simple in-memory caching.
 * The cache is unique per wrapped function.
 */
export function withMemoryCache<T>(
  fn: () => Promise<T>,
  ttlMs: number,
): () => Promise<T> {
  let cache: { data: T; expiresAt: number } | null = null;

  return async () => {
    if (cache && Date.now() < cache.expiresAt) {
      return cache.data;
    }

    const data = await fn();
    cache = { data, expiresAt: Date.now() + ttlMs };
    return data;
  };
}
export const normalizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/&amp;/g, "")
    .replace("&", "")
    .replace(",", "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "-");
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
