import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";
import z from "zod";
import { KV } from "../../db/kv.js";
import { env } from "../../env.js";
import { sectorsData } from "./sectors.js";

const supportedSectors = new Set<string>(sectorsData.map((e) => e.slug));

export const GetSectorsReportParams = z.object({
  subsectors: z
    .string()
    .array()
    .describe(`Supported slugs: ${Array.from(supportedSectors).join(", ")}`),
});

const normalizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/&amp;/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "-");
};

export const getSectorsReport = async (
  input: z.infer<typeof GetSectorsReportParams>,
): Promise<
  { success: true; data: any } | { success: false; message: string }
> => {
  try {
    const normalizedInput = input.subsectors.map((s) =>
      supportedSectors.has(s) ? s : normalizeSlug(s),
    );

    const invalidSlugs = normalizedInput.filter(
      (s) => !supportedSectors.has(s),
    );
    if (invalidSlugs.length > 0) {
      return {
        success: false,
        message: `Invalid subsectors. Supported slugs: ${Array.from(supportedSectors).join(", ")}`,
      };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const data = await KV.getOrSet(
      "stock.aggregator.sectors-report",
      async () => {
        const response = await axios.get(
          env.AGGREGATOR_COMPANY_REPORT_ENDPOINT,
          {
            headers: {
              ...JSON.parse(env.AGGREGATOR_AUTH),
              "Content-Type": "application/json",
            },
          },
        );

        return response.data as {
          sector: string;
          sub_sector: string;
          slug: string;
          [key: string]: any;
        }[];
      },
      tomorrow,
    );

    const filtered = (data! as any[]).filter((item) =>
      normalizedInput.includes(item.slug),
    );

    return { success: true, data: filtered };
  } catch (error) {
    logger.error({ err: error }, "Failed to get sectors report");
    return { success: false, message: "Failed to get sectors report" };
  }
};
