import type { Context } from "grammy";
import { logger } from "../utils/logger.js";

interface PendingGroup {
  messages: Context[];
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Collects messages belonging to the same media_group_id and invokes
 * the handler once with all collected contexts after a short debounce.
 */
export function createMediaGroupCollector(
  handler: (contexts: Context[]) => Promise<void>,
  debounceMs = 2000,
) {
  const pending = new Map<string, PendingGroup>();

  return (ctx: Context) => {
    const groupId = ctx.message?.media_group_id;

    // No media group — single message, handle immediately
    if (!groupId) {
      return handler([ctx]);
    }

    const existing = pending.get(groupId);
    if (existing) {
      existing.messages.push(ctx);
      clearTimeout(existing.timer);
      logger.info(
        { groupId, count: existing.messages.length },
        "media-group: buffering message",
      );
      existing.timer = setTimeout(() => {
        pending.delete(groupId);
        logger.info(
          { groupId, count: existing.messages.length },
          "media-group: dispatching",
        );
        handler(existing.messages);
      }, debounceMs);
    } else {
      const group: PendingGroup = {
        messages: [ctx],
        timer: setTimeout(() => {
          pending.delete(groupId);
          logger.info(
            { groupId, count: group.messages.length },
            "media-group: dispatching",
          );
          handler(group.messages);
        }, debounceMs),
      };
      pending.set(groupId, group);
      logger.info({ groupId }, "media-group: new group started");
    }
  };
}
