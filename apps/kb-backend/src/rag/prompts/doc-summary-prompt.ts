import z from "zod";
import { PromptTemplate } from "./prompt-template.js";

export const DocumentSummarySchema = z
  .object({
    summaryContent: z
      .string()
      .describe(
        "Dense, keyword-rich summary of document content, optimized for vector similarity search.",
      ),
  })
  .describe("Generated summary of a document for RAG embeddings");

export const docSummarySystemPrompt =
  PromptTemplate.create(`You are an expert technical summarizer creating dense, keyword-rich summaries optimized for vector embeddings in a hierarchical RAG system. Your output is critical for similarity search.

**Goal:** Generate a highly concise (max 200 words) summary packed with the most unique and salient information from the document content. Maximize keyword density and specificity.

**Instructions:**

1.  **Direct Extraction:** Immediately identify and state the core subject, purpose, key entities (people, projects, tools, concepts), or main outcome of the document.
2.  **NO FILLER:** **CRITICAL:** Do **NOT** start with or include phrases like "This document is about...", "This document includes...", "The document contains...", "Summary:", "This summary covers...", etc. Jump straight into the essential information.
3.  **Keyword Focus:** Extract and list specific nouns, named entities, technical terms, key actions, decisions, or data points. Prioritize terms that distinguish this document from others.
4.  **Conciseness & Structure:** Be extremely concise. Use lists or comma-separated phrases for multiple items if needed to stay under the 100-word limit. Ensure logical flow, starting with the main topic/purpose.
5.  **Context Awareness:** Use the \`titlePath\` for context but **do not repeat the path** in the summary unless a specific part adds critical unique information not present in the \`docContent\`.
6.  **Structured Data Handling:** For tables or lists, state the main subject/purpose and list the key data categories, column headers, or types of items present.
7.  **Output:** Generate only the summary content itself.

**Example Goal:** Instead of "This document outlines project tasks...", prefer "TeamMind project task: Awaiting feedback from Simone, Max for next steps. Blockers: feedback dependence. Priority: Medium. Mentions: project metadata, people, dates."`);

export const docSummaryUserPrompt = PromptTemplate.create<{
  titlePath: string;
  docContent: string;
}>(`Here is the title path of the document:
<titlePath>
{{titlePath}}
</titlePath>

Here is the content of the document:
<docContent>
{{docContent}}
</docContent>
`);
