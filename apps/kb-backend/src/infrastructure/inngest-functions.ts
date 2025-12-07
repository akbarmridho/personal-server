import type { InngestFunction } from "inngest";
import { updateCompanies } from "../data-modules/profiles/companies.js";
import { snipsIngestPart } from "../data-modules/snips-newsletter/ingest.js";
import { env } from "./env.js";
import { inngest } from "./inngest.js";
import { telegraf } from "./telegram.js";

const failureNotification = inngest.createFunction(
  { id: "handle-any-fn-failure" },
  { event: "inngest/function.failed" },
  async ({ event }) => {
    const payload = JSON.stringify(event, null, 2);

    await telegraf.telegram.sendMessage(
      env.TELEGRAM_CHANNEL_ID,
      `Inngest run failure:${payload}`,
    );
  },
);

export const inngestFunctions: InngestFunction.Like[] = [
  failureNotification,
  updateCompanies,
  snipsIngestPart,
];
