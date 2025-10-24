import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";
import dayjs from "dayjs";
import z from "zod";
import { KV } from "../../db/kv.js";
import { env } from "../../env.js";
import { normalizeSlug } from "../utils.js";
import { supportedSubsectors } from "./sectors.js";

export const GetSectorsReportParams = z.object({
  subsectors: z
    .string()
    .array()
    .describe(
      `Array of subsector slugs. Supported slugs: ${Array.from(supportedSubsectors).join(", ")}`,
    ),
});

export const getSectorsReport = async (
  input: z.infer<typeof GetSectorsReportParams>,
): Promise<
  { success: true; data: any } | { success: false; message: string }
> => {
  try {
    const normalizedInput = input.subsectors.map((s) =>
      supportedSubsectors.has(s) ? s : normalizeSlug(s),
    );

    const invalidSlugs = normalizedInput.filter(
      (s) => !supportedSubsectors.has(s),
    );

    if (invalidSlugs.length > 0) {
      return {
        success: false,
        message: `Invalid subsectors. Supported slugs: ${Array.from(supportedSubsectors).join(", ")}`,
      };
    }

    const data = await KV.getOrSet(
      "stock.aggregator.sectors-report",
      async () => {
        const response = await axios.get(
          env.AGGREGATOR_SECTORS_REPORT_ENDPOINT,
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
      dayjs().add(1, "week").toDate(),
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
