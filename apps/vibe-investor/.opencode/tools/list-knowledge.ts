import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";
import matter from "gray-matter";

const VALID_CATEGORIES = [
  "technical-analysis",
  "fundamental-analysis",
  "flow-analysis",
  "narrative-analysis",
  "portfolio-management",
] as const;

type Category = (typeof VALID_CATEGORIES)[number];

export default tool({
  description:
    "List available entries in the knowledge catalog. The catalog contains supplementary reference material — sector-specific frameworks, calculation methods, regulatory context, and other deep knowledge organized by category.",
  args: {
    category: tool.schema
      .string()
      .optional()
      .describe(
        "Filter by category: technical-analysis, fundamental-analysis, flow-analysis, narrative-analysis, portfolio-management. Omit to list all.",
      ),
  },
  async execute(args, context) {
    const catalogPath = process.env.KNOWLEDGE_CATALOG_PATH;
    if (!catalogPath) {
      throw new Error(
        "KNOWLEDGE_CATALOG_PATH not set. Add it to your .env file.",
      );
    }

    // Validate category if provided
    if (
      args.category &&
      !VALID_CATEGORIES.includes(args.category as Category)
    ) {
      throw new Error(
        `Invalid category: "${args.category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      );
    }

    const resolvedPath = resolve(context.directory, catalogPath);

    let files: string[];
    try {
      files = await readdir(resolvedPath);
    } catch {
      throw new Error(`Cannot read knowledge catalog at: ${resolvedPath}`);
    }

    const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

    const entries: { name: string; description: string; category: string }[] =
      [];
    for (const file of mdFiles) {
      try {
        const raw = await readFile(join(resolvedPath, file), "utf-8");
        const { data: fm } = matter(raw);
        if (!fm.name || !fm.description || !fm.category) continue;
        if (args.category && fm.category !== args.category) continue;
        entries.push({
          name: fm.name,
          description: fm.description,
          category: fm.category,
        });
      } catch {
        // Skip unreadable files
      }
    }

    if (entries.length === 0) {
      return args.category
        ? `No knowledge entries found for category: ${args.category}`
        : "No knowledge entries found in catalog.";
    }

    // Group by category
    const byCategory = new Map<string, typeof entries>();
    for (const entry of entries) {
      const list = byCategory.get(entry.category) ?? [];
      list.push(entry);
      byCategory.set(entry.category, list);
    }

    const sections: string[] = [];
    for (const [cat, items] of [...byCategory.entries()].sort()) {
      const lines = items.map((e) => `  - **${e.name}**: ${e.description}`);
      sections.push(`**${cat}**\n${lines.join("\n")}`);
    }

    return `Knowledge catalog (${entries.length} entries):\n\n${sections.join("\n\n")}`;
  },
});
