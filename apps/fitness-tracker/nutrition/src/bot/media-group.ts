import type { Context } from "grammy";

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

    // No media group — single photo, handle immediately
    if (!groupId) {
      return handler([ctx]);
    }

    const existing = pending.get(groupId);
    if (existing) {
      existing.messages.push(ctx);
      clearTimeout(existing.timer);
      existing.timer = setTimeout(() => {
        pending.delete(groupId);
        handler(existing.messages);
      }, debounceMs);
    } else {
      const group: PendingGroup = {
        messages: [ctx],
        timer: setTimeout(() => {
          pending.delete(groupId);
          handler(group.messages);
        }, debounceMs),
      };
      pending.set(groupId, group);
    }
  };
}
