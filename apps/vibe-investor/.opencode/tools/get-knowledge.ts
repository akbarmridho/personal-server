import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";
import matter from "gray-matter";

export default tool({
  description:
    "Retrieve a specific knowledge entry by name. Returns the full content of the knowledge document. Use list-knowledge first to discover available entries.",
  args: {
    name: tool.schema
      .string()
      .describe(
        "Name of the knowledge entry (e.g., 'banking-sector', 'coal-sector'). Must match the entry name from list-knowledge.",
      ),
  },
  async execute(args, context) {
    const catalogPath = process.env.KNOWLEDGE_CATALOG_PATH;
    if (!catalogPath) {
      throw new Error(
        "KNOWLEDGE_CATALOG_PATH not set. Add it to your .env file.",
      );
    }

    const resolvedPath = resolve(context.directory, catalogPath);
    const name = args.name.trim().toLowerCase();

    // Validate name format
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      throw new Error(
        `Invalid name format: "${args.name}". Must be lowercase alphanumeric with hyphens (e.g., 'banking-sector').`,
      );
    }

    const filePath = join(resolvedPath, `${name}.md`);

    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch {
      throw new Error(
        `Knowledge entry not found: "${name}". Use list-knowledge to see available entries.`,
      );
    }

    const { content } = matter(raw);
    const body = content.trim();

    if (!body) {
      return `Knowledge entry "${name}" exists but has no content.`;
    }

    return body;
  },
});
