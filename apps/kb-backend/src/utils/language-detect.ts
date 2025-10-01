export type ContentType = "html" | "markdown" | "unknown";

export function detectContentType(input: string): ContentType {
  const text = input.trim();
  if (!text) return "unknown";

  let htmlScore = 0;
  let mdScore = 0;

  // --- HTML Heuristics ---
  if (/^\s*<!DOCTYPE html>/i.test(text)) htmlScore += 5;
  if (/^\s*<html[\s>]/i.test(text)) htmlScore += 5;
  if (/<[a-z][^>]*>/i.test(text)) htmlScore += 2; // opening tag
  if (/<\/[a-z]+>/i.test(text)) htmlScore += 2; // closing tag
  if (/&[a-z]+;/.test(text)) htmlScore += 1; // HTML entities like &nbsp;

  // --- Markdown Heuristics ---
  if (/^#{1,6}\s.+/m.test(text)) mdScore += 2; // Heading
  if (/\*\*[^*]+\*\*/.test(text)) mdScore += 2; // Bold
  if (/\*[^*]+\*/.test(text)) mdScore += 1; // Italic
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) mdScore += 2; // Link
  if (/!\[[^\]]*\]\([^)]+\)/.test(text)) mdScore += 2; // Image
  if (/^>\s.+/m.test(text)) mdScore += 1; // Blockquote
  if (/^[-*+]\s.+/m.test(text)) mdScore += 1; // List
  if (/^\d+\.\s.+/m.test(text)) mdScore += 1; // Ordered list
  if (/^---$|^\*\*\*$|^___$/m.test(text)) mdScore += 1; // Horizontal rule
  if (/`{1,3}[^`]+`{1,3}/.test(text)) mdScore += 2; // Inline/code block

  // --- Decision ---
  if (htmlScore === 0 && mdScore === 0) return "unknown";
  if (htmlScore > mdScore) return "html";
  if (mdScore > htmlScore) return "markdown";

  return "unknown"; // tie
}
