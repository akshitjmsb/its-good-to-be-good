/**
 * Poetry recents. Maps the old `poetry_recents` table.
 * `replace` mirrors the old delete-all-then-insert semantics.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_POETRY_RECENTS = 6;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("poetryRecents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(MAX_POETRY_RECENTS);

    return rows.map((r) => ({
      poet: r.poet,
      language: r.language,
      timestamp: r.timestamp,
    }));
  },
});

export const replace = mutation({
  args: {
    recents: v.array(
      v.object({
        poet: v.string(),
        language: v.string(),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, { recents }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("poetryRecents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .collect();
    for (const r of existing) {
      await ctx.db.delete(r._id);
    }

    for (const r of recents) {
      await ctx.db.insert("poetryRecents", {
        userId,
        poet: r.poet,
        language: r.language,
        timestamp: r.timestamp,
      });
    }
  },
});
