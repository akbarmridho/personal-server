import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts hyphenated and "and" phrases to capitalized format with "&"
 * Example: "word-and-letter" -> "Word & Letter"
 * Example: "basic-materials" -> "Basic Materials"
 */
export function formatHyphenatedText(text: string): string {
  return text
    .replaceAll("-", " ")
    .replaceAll(" and ", " & ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
