import { generateObject } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { v5 as uuidv5 } from "uuid";
import z from "zod";
import { inngest } from "../../infrastructure/inngest.js";
import { knowledgeService } from "../../infrastructure/knowledge-service.js";
import { pdfModel } from "../../infrastructure/llm.js";
import { logger } from "../../utils/logger.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";
import { type InstagramPost, markIngested } from "./utils.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const namespace = "a7c3e1f0-8b2d-4e5a-9f1c-3d6e8a2b4c7f";

const InstagramAnalysisSchema = z.object({
  relevant: z
    .boolean()
    .describe(
      "Whether this post is relevant to Indonesian stock market / investment knowledge base. Promotional content, personal life posts, memes without market insight should be false.",
    ),
  title: z
    .string()
    .describe(
      "A concise title summarizing the post content. Empty string if not relevant.",
    ),
  content: z
    .string()
    .describe(
      "Reconstructed content combining the caption text and any text/data visible in the images. Write in the original language of the post. Empty string if not relevant.",
    ),
});

function buildImagePayload(
  post: InstagramPost,
): Array<{ type: "image"; image: URL } | { type: "text"; text: string }> {
  const parts: Array<
    { type: "image"; image: URL } | { type: "text"; text: string }
  > = [];

  const imageUrls =
    post.images.length > 0
      ? post.images
      : post.displayUrl
        ? [post.displayUrl]
        : [];

  for (const url of imageUrls) {
    parts.push({ type: "image", image: new URL(url) });
  }

  return parts;
}

export const instagramIngest = inngest.createFunction(
  {
    id: "instagram-ingest",
    concurrency: 2,
  },
  { event: "data/instagram-ingest" },
  async ({ event, step }) => {
    const { post, notify } = event.data;

    const analysis = await step.run("analyze", async () => {
      const imageParts = buildImagePayload(post);

      const { object } = await generateObject({
        model: pdfModel,
        schema: InstagramAnalysisSchema,
        messages: [
          {
            role: "system",
            content: `You are an Investment Content Analyst for an Indonesian Stock Market Knowledge Base.

Analyze this Instagram post and determine:
1. Is it RELEVANT to stock market investing, company analysis, financial data, market commentary, or economic insights for the Indonesian market (BEI/IDX)?
2. If relevant, extract a title and reconstruct the full content.

RELEVANT examples: stock analysis, company earnings discussion, market commentary, sector analysis, financial data comparison, investment thesis.
NOT RELEVANT: personal life updates, promotional/advertising content, motivational quotes without market context, food/travel posts, pure political commentary without market implications.

For content reconstruction:
- Combine the caption text with any text, data, tables, or charts visible in the images.
- Preserve the original language (mostly Indonesian).
- Include key financial figures, comparisons, and data points from images.
- Structure the content clearly with the caption first, then image-derived content.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Instagram post by @${post.ownerUsername} (${post.ownerFullName})
Posted: ${post.timestamp}
Caption: ${post.caption || "(no caption)"}
Alt text: ${post.alt || "(none)"}

Analyze the post and images below:`,
              },
              ...imageParts,
            ],
          },
        ],
        maxRetries: 2,
      });

      return object;
    });

    if (!analysis.relevant) {
      await step.run("mark-ingested-skip", async () => {
        await markIngested(post.id);
      });
      logger.info(
        { postId: post.id, url: post.url },
        "Instagram post not relevant, skipping",
      );
      return { skipped: true, postId: post.id };
    }

    const payload = await step.run("process", async () => {
      const documentDate = post.timestamp
        ? dayjs(post.timestamp).tz("Asia/Jakarta").format("YYYY-MM-DD")
        : dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

      const fullContent = analysis.content;
      const [symbols] = await extractSymbolFromTexts([
        `${analysis.title}\n${fullContent}`,
      ]);

      const [tagged] = await tagMetadata([
        {
          date: documentDate,
          content: fullContent,
          title: analysis.title,
          urls: [post.url],
          subindustries: [],
          subsectors: [],
          symbols: symbols ?? [],
          indices: [],
        },
      ]);

      return {
        id: uuidv5(`instagram-${post.id}`, namespace),
        type: "analysis" as const,
        title: tagged.title,
        content: tagged.content,
        document_date: tagged.date,
        source: {
          name: "instagram",
          username: post.ownerUsername,
        },
        urls: tagged.urls,
        symbols: tagged.symbols,
        subindustries: tagged.subindustries,
        subsectors: tagged.subsectors,
        indices: tagged.indices,
      };
    });

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });

    await step.run("mark-ingested", async () => {
      await markIngested(post.id);
    });

    if (notify) {
      await step.sendEvent("notify-discord", [
        {
          name: "notify/discord-kb-ingestion",
          data: { payload: [payload] },
        },
      ]);
    }

    return { ingested: true, postId: post.id };
  },
);
