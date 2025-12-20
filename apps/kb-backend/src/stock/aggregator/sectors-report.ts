import axios from "axios";
import dayjs from "dayjs";
import z from "zod";
import {
  normalizeSector,
  supportedSubsectors,
} from "../../data-modules/profiles/sector.js";
import { KV } from "../../infrastructure/db/kv.js";
import { env } from "../../infrastructure/env.js";
import { logger } from "../../utils/logger.js";

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
      supportedSubsectors.has(s) ? s : normalizeSector(s),
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
      "stock.aggregator.sectors-report-v2",
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

        const data = response.data as {
          sector: string;
          sub_sector: string;
          slug: string;
          [key: string]: any;
        }[];

        return data.map((e) => {
          const { sector, sub_sector, slug, description, ...rest } = e;

          return {
            sector: normalizeSector(sector),
            subSector: normalizeSector(sub_sector),
            ...rest,
          };
        });
      },
      dayjs().add(1, "week").toDate(),
    );

    const filtered = (data! as any[]).filter((item) =>
      normalizedInput.includes(item.subSector),
    );

    return { success: true, data: filtered };
  } catch (error) {
    logger.error({ err: error }, "Failed to get sectors report");
    return { success: false, message: "Failed to get sectors report" };
  }
};
