/**
 * Content cache. Maps the old `content_cache` table, keyed by
 * (user, contentType, dateKey). The SDK scopes contentType with the module id.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: { contentType: v.string(), dateKey: v.string() },
  handler: async (ctx, { contentType, dateKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const row = await ctx.db
      .query("contentCache")
      .withIndex("by_user_type_date", (q) =>
        q.eq("userId", userId).eq("contentType", contentType).eq("dateKey", dateKey)
      )
      .unique();

    return row ? row.content : null;
  },
});

export const set = mutation({
  args: { contentType: v.string(), dateKey: v.string(), content: v.any() },
  handler: async (ctx, { contentType, dateKey, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("contentCache")
      .withIndex("by_user_type_date", (q) =>
        q.eq("userId", userId).eq("contentType", contentType).eq("dateKey", dateKey)
      )
      .unique();

    const updatedAt = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { content, updatedAt });
    } else {
      await ctx.db.insert("contentCache", {
        userId,
        contentType,
        dateKey,
        content,
        updatedAt,
      });
    }
  },
});
