import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { inngest } from "../../infrastructure/inngest.js";

const turndownService = new TurndownService();

async function extractImageContent(
  imageUrl: string,
  retries = 3,
): Promise<string> {
  for (let i = 0; i < retries; i++) {
    const { text } = await generateText({
      model: openrouter("google/gemini-2.5-flash-lite-preview-09-2025", {
        models: ["google/gemini-2.5-flash-lite"],
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract and describe the content of this image. Always output as HTML. If it contains text, tables, or data, use appropriate HTML tags (<p>, <table>, etc.). If it's a non-text image (photo, diagram, chart), wrap your explanation in <p> tags.",
            },
            { type: "image", image: imageUrl },
          ],
        },
      ],
      maxRetries: 3,
      abortSignal: AbortSignal.timeout(3 * 60 * 1000),
    });

    const htmlMatch = text.match(/```html\s*([\s\S]*?)```/);
    const result = htmlMatch ? htmlMatch[1].trim() : text.trim();

    if (result) return result;
  }

  return "";
}

export const snipsScrape = inngest.createFunction(
  { id: "snips-scrape", concurrency: 5 },
  { event: "data/snips-scrape" },
  async ({ event, step }) => {
    const rawHtml = await step.run("scrape", async () => {
      const { data: html } = await axios.get(event.data.url);

      return html;
    });

    const parts = await step.run("process", async () => {
      const $ = cheerio.load(rawHtml);

      const title = $(".entry-title a").text().trim();

      let date = $('meta[itemprop="datePublished"]').attr("content");
      if (!date) {
        date = $(".date time.published").attr("datetime");
      }

      if (!date) {
        throw new Error("Date not found");
      }

      $("script").remove();
      $("style").remove();
      $("meta").remove();
      $("link").remove();

      $("[style]").each(function () {
        $(this).removeAttr("style");
      });

      const contents: string[] = [];

      // MANDATORY LINE: Get the container using the first h2's parent
      const $container = $("h2").first().parent();

      const children = $container.children().toArray();

      let h2Count = 0;
      let mainContentBuffer = "";

      for (const element of children) {
        const $el = $(element);

        if ($el.is("h2")) {
          h2Count++;

          // Case: Transition from Main Content (2) to Lists (3)
          if (h2Count === 3) {
            // Push whatever main content we collected
            if (mainContentBuffer) {
              contents.push(
                `# ${title}\n\n${turndownService.turndown(mainContentBuffer)}`,
              );
            }
          }

          continue; // Skip the headers themselves
        }

        // Section: Main Content (Between 2nd H2 and 3rd H2)
        if (h2Count === 2) {
          if ($el.is("figure")) {
            const imgSrc = $el.find("img").attr("src");
            if (imgSrc) {
              const imageContent = await extractImageContent(imgSrc);
              mainContentBuffer += imageContent;
            }
          } else {
            mainContentBuffer += $.html(element);
          }
        }

        // Section: Lists (Between 3rd H2 and n-th H2)
        if (h2Count >= 3) {
          // Only process UL elements in this specific section
          if ($el.is("ul")) {
            // Use .children() instead of .find() to handle nested lists correctly.
            // This treats a top-level LI (and any nested ULs inside it) as one content block.
            $el.children("li").each((_, li) => {
              contents.push(turndownService.turndown($.html(li.childNodes)));
            });
          }
        }
      }

      return {
        date,
        contents,
      };
    });

    await step.sendEvent("ingest-parts", {
      name: "data/snips-part",
      data: {
        payload: parts.contents.map((content) => {
          return {
            date: parts.date,
            content: content,
          };
        }),
      },
    });
  },
);
