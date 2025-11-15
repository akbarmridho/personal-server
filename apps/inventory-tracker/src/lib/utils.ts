import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Natural sort function that handles sizes like S, M, L, XL properly
export function naturalSort(a: string, b: string): number {
  // Common size patterns and their order
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

  // Extract size part by checking all components for size patterns
  const extractSize = (str: string): string => {
    const parts = str.trim().split(/\s+/);

    // Check each part to see if it matches a size pattern
    for (const part of parts) {
      const upperPart = part.toUpperCase();

      // Normalize common variations
      const normalizedPart =
        upperPart === "2XL" ? "XXL" : upperPart === "3XL" ? "XXXL" : upperPart;

      // Check if this part is a recognized size
      if (["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(normalizedPart)) {
        return normalizedPart;
      }
    }

    // If no size found, return empty string
    return "";
  };

  const aSize = extractSize(a);
  const bSize = extractSize(b);

  // Check if both strings contain sizes
  const aIsSize = aSize !== "";
  const bIsSize = bSize !== "";

  if (aIsSize && bIsSize) {
    const aIndex = sizeOrder.indexOf(aSize);
    const bIndex = sizeOrder.indexOf(bSize);
    return aIndex - bIndex;
  }

  // If only one is a size, non-sizes come first
  if (aIsSize) return 1;
  if (bIsSize) return -1;

  // For non-sizes, use locale compare for proper alphabetical sorting
  return a.localeCompare(b);
}
