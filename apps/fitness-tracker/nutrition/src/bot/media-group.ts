import type { Context } from "grammy";
import { logger } from "../utils/logger.js";

interface PendingGroup {
  messages: Context[];
  timer: ReturnType<typeof setTimeout>;
  handler: (contexts: Context[]) => Promise<void>;
}

/** Shared registry of in-flight media groups across all handlers */
const pendingGroups = new Map<string, PendingGroup>();

/**
 * Collects messages belonging to the same media_group_id and invokes
 * the handler once with all collected contexts after a short debounce.
 */
export function createMediaGroupCollector(
  handler: (contexts: Context[]) => Promise<void>,
  debounceMs = 2000,
) {
  return (ctx: Context) => {
    const groupId = ctx.message?.media_group_id;

    // No media group — single message, handle immediately
    if (!groupId) {
      return handler([ctx]);
    }

    const existing = pendingGroups.get(groupId);
    if (existing) {
      existing.messages.push(ctx);
      clearTimeout(existing.timer);
      logger.info(
        { groupId, count: existing.messages.length },
        "media-group: buffering message",
      );
      existing.timer = setTimeout(() => {
        pendingGroups.delete(groupId);
        logger.info(
          { groupId, count: existing.messages.length },
          "media-group: dispatching",
        );
        existing.handler(existing.messages);
      }, debounceMs);
    } else {
      const group: PendingGroup = {
        messages: [ctx],
        handler,
        timer: setTimeout(() => {
          pendingGroups.delete(groupId);
          logger.info(
            { groupId, count: group.messages.length },
            "media-group: dispatching",
          );
          handler(group.messages);
        }, debounceMs),
      };
      pendingGroups.set(groupId, group);
      logger.info({ groupId }, "media-group: new group started");
    }
  };
}

/**
 * Check if a media group is already being collected by another handler.
 * Used by the catch-all photo handler to avoid stealing photos from
 * command-initiated media groups.
 */
export function isMediaGroupPending(groupId: string | undefined): boolean {
  if (!groupId) return false;
  return pendingGroups.has(groupId);
}

/**
 * Append a context to an existing pending media group.
 * Used when subsequent photos in a group arrive via the catch-all handler.
 */
export function appendToMediaGroup(groupId: string, ctx: Context): void {
  const existing = pendingGroups.get(groupId);
  if (!existing) return;
  existing.messages.push(ctx);
  clearTimeout(existing.timer);
  logger.info(
    { groupId, count: existing.messages.length },
    "media-group: appended from catch-all",
  );
  existing.timer = setTimeout(() => {
    pendingGroups.delete(groupId);
    logger.info(
      { groupId, count: existing.messages.length },
      "media-group: dispatching",
    );
    existing.handler(existing.messages);
  }, 2000);
}
