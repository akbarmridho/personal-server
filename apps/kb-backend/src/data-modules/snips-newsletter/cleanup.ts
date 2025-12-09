import emojiRegex from "emoji-regex";
import he from "he";
import remarkParse from "remark-parse";
import stripMarkdown from "strip-markdown";
import { unified } from "unified";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import type { Snips } from "./types.js";

/**
 * Normalize problematic/invisible Unicode to safe ASCII where appropriate.
 * Standalone TypeScript/Node.js port of the Python `clean_text` function.
 *
 * Note: The original Python version uses `ftfy.fix_text` for advanced Unicode
 * cleanup. Here we approximate with standard Unicode normalization only.
 */
export function cleanUnicodeChars(
  text: string,
  preserveInvisible: boolean = false,
  preserveQuotes: boolean = false,
  preserveDashes: boolean = false,
  preserveFullwidthBrackets: boolean = false,
): string {
  // Rough replacement for `ftfy.fix_text` – basic Unicode normalization only.
  // You may change to "NFKC" or another form if preferred.
  text = text.normalize("NFC");

  // Quote normalization
  if (!preserveQuotes) {
    // Pass 1: explicit fast translations
    const QUOTE_ELLIPSIS_MAP: Record<string, string> = {
      "\u2018": "'", // ‘
      "\u2019": "'", // ’
      "\u201B": "'", // ‛
      "\u201A": "'", // ‚
      "\u2039": "'", // ‹
      "\u203A": "'", // ›
      "\u02BC": "'", // ʼ
      "\uFF07": "'", // ＇
      "\u201C": '"', // “
      "\u201D": '"', // ”
      "\u201E": '"', // „
      "\u201F": '"', // ‟
      "\u00AB": '"', // «
      "\u00BB": '"', // »
      "\uFF02": '"', // ＂
      "\u2026": "...", // …
      "\u22EF": "...", // ⋯
      "\u2025": "..", // ‥
    };

    // Apply explicit map
    text = Array.from(text, (ch) => QUOTE_ELLIPSIS_MAP[ch] ?? ch).join("");

    // Pass 2: fallback for remaining opening/closing punctuation
    // We don't have Python's `unicodedata.category`/`name` in JS, so:
    // - collapse any remaining paired punctuation (Pi/Pf) to a double quote.
    const PAIRED_PUNCT_RE = /\p{Pi}|\p{Pf}/u;

    let mapped = "";
    for (const ch of text) {
      if (PAIRED_PUNCT_RE.test(ch)) {
        mapped += '"';
      } else {
        mapped += ch;
      }
    }
    text = mapped;
  }

  // Dash normalization
  if (!preserveDashes) {
    // EM dash → space-dash-space
    text = text.replace(/\s*\u2014\s*/g, " - ");
    // EN dash → hyphen-minus
    text = text.replace(/\u2013/g, "-");
  }

  // Fold select fullwidth punctuation that affects monospace alignment
  if (!preserveFullwidthBrackets) {
    const FULLWIDTH_FOLD: Record<string, string> = {
      "\u3010": "[", // 【
      "\u3011": "]", // 】
    };

    if ([...text].some((ch) => ch in FULLWIDTH_FOLD)) {
      text = Array.from(text, (ch) => FULLWIDTH_FOLD[ch] ?? ch).join("");
    }
  }

  // Zs separators → ASCII space
  text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");

  if (!preserveInvisible) {
    // Remove zero-width, bidi, and control invisibles
    text = text.replace(
      /[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
      "",
    );
  }

  // Strip trailing spaces/tabs on each line
  text = text.replace(/[ \t]+(\r?\n)/g, "$1");

  // Remove whitespace-only lines' spaces/tabs (keep the newline)
  text = text.replace(/^[ \t]+(\r?\n)/gm, "$1");

  // If the file ends with spaces/tabs but no newline yet, drop them
  text = text.replace(/[ \t]+$/g, "");

  return text;
}

export interface InputData {
  date: string;
  content: string;
}

// AST Node Types for Type Safety
interface LinkNode extends Node {
  type: "link";
  url: string;
  children: Node[];
}

interface HeadingNode extends Node {
  type: "heading";
  depth: number;
  children: Array<{ value?: string; children?: Array<{ value?: string }> }>;
}

interface TextNode extends Node {
  type: "text";
  value: string;
}

/**
 * Custom Compiler to output Clean Plain Text.
 * Replaces remark-stringify.
 * It joins paragraphs with double newlines and ignores escaping rules.
 */
function plainTextCompiler(this: any) {
  this.Compiler = (tree: ParentNode) => {
    // The tree structure after strip-markdown is typically: Root -> Paragraphs -> Text
    // We map over the top-level nodes (usually paragraphs)
    const paragraphs = (tree.children as any).map((node) => {
      // For each paragraph, we join its internal text nodes
      if ("children" in node) {
        return ((node as ParentNode).children as any)
          .map((child) => (child as TextNode).value || "")
          .join("");
      }
      return (node as TextNode).value || "";
    });

    // Join paragraphs with double newline to preserve readability
    return paragraphs.join("\n\n").trim();
  };
}
/**
 * Custom Unified Plugin to extract metadata (Links/Titles)
 * BEFORE the strip-markdown plugin removes the formatting.
 */
function extractMetadataPlugin() {
  return (tree: Node, file: VFile) => {
    // Initialize storage in the VFile data object
    file.data.symbols = [] as string[];
    file.data.urls = [] as string[];
    file.data.extractedTitle = null as string | null;

    visit(tree, (node) => {
      // 1. Extract Title (Header 1)
      // Logic: If it's a heading of depth 1, extract its text content.
      if (node.type === "heading" && (node as HeadingNode).depth === 1) {
        if (!file.data.extractedTitle) {
          // Flatten children to get the title text (handles cases like # **Bold Title**)
          const textNodes: string[] = [];
          visit(node, "text", (textNode) => {
            textNodes.push((textNode as TextNode).value);
          });
          file.data.extractedTitle = textNodes.join("");
        }
      }

      // 2. Extract Links
      if (node.type === "link") {
        const url = (node as LinkNode).url;
        const stockbitMatch = url.match(
          /https:\/\/stockbit\.com\/symbol\/([A-Z0-9]+)/i,
        );

        if (stockbitMatch) {
          (file.data.symbols as string[]).push(stockbitMatch[1]);
        } else {
          (file.data.urls as string[]).push(url);
        }
      }
    });
  };
}

const regex = emojiRegex();

function stripEmoji(value?: string | null, replacement = "") {
  if (!value) {
    return value;
  }

  return value.replace(regex, replacement);
}

/**
 * Main processing function.
 * * 1. Removes leading bullets/numbers via Regex.
 * 2. Parses Markdown to AST.
 * 3. Extracts Symbols, URLs, and Titles (Plugin).
 * 4. Strips Markdown formatting (Bold, Italic, Links) -> Plain Text.
 * 5. Returns structured data.
 */
export async function cleanupSnips(data: InputData[]): Promise<Snips[]> {
  // Define the processor pipeline
  const processor = unified()
    .use(remarkParse) // Parse string to AST
    .use(extractMetadataPlugin) // Extract data (runs on AST)
    .use(stripMarkdown) // Remove formatting (runs on AST)
    .use(plainTextCompiler); // Compile AST back to String

  // Process all items in parallel
  const results = await Promise.all(
    data.map(async (item) => {
      // Clean leading list markers (*, -, 1., 20.)
      let content = cleanUnicodeChars(item.content);
      content = item.content.replace(/^(\*|-|\d+\.)\s+/, "");

      // strip emoji
      content = stripEmoji(content) || "";

      // decode html entities
      content = he.decode(content);

      // Run the Unified pipeline
      const file = await processor.process(content);

      let title = (file.data.extractedTitle as string) || null;

      if (title?.includes("Stockbit Snips")) {
        title = title.replaceAll("Stockbit Snips", "");
      }

      return {
        date: item.date,
        // file.value contains the plain text result from stripMarkdown + stringify
        content: String(file).trim(),
        // file.data contains the extraction results from our custom plugin
        symbols: (file.data.symbols as string[]) || [],
        urls: (file.data.urls as string[]) || [],
        title: title,
        subsectors: [],
        subindustries: [],
        indices: [],
      };
    }),
  );

  return results;
}
