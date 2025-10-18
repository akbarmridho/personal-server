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
