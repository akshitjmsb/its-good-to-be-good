/**
 * French translator history. Maps the old `french_history` table.
 * Returned rows match the client's `HistoryEntry` shape (snake_case + ISO
 * created_at derived from the system `_creationTime`).
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const mode = v.union(v.literal("en-to-fr"), v.literal("fr-to-en"));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("frenchHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return rows.map((r) => ({
      id: r._id as string,
      mode: r.mode,
      source_text: r.sourceText,
      translation: r.translation,
      meaning: r.meaning,
      breakdown: r.breakdown,
      created_at: new Date(r._creationTime).toISOString(),
    }));
  },
});

/** Most-recent source texts, used as the word-of-the-day avoid-list. */
export const learnedWords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("frenchHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    return rows
      .map((r) => r.sourceText?.trim())
      .filter((w): w is string => !!w);
  },
});

export const add = mutation({
  args: {
    mode,
    sourceText: v.string(),
    translation: v.string(),
    meaning: v.string(),
    breakdown: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const id = await ctx.db.insert("frenchHistory", {
      userId,
      mode: args.mode,
      sourceText: args.sourceText,
      translation: args.translation,
      meaning: args.meaning,
      breakdown: args.breakdown,
    });

    const doc = await ctx.db.get(id);
    if (!doc) return null;
    return {
      id: doc._id as string,
      mode: doc.mode,
      source_text: doc.sourceText,
      translation: doc.translation,
      meaning: doc.meaning,
      breakdown: doc.breakdown,
      created_at: new Date(doc._creationTime).toISOString(),
    };
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rows = await ctx.db
      .query("frenchHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const r of rows) {
      await ctx.db.delete(r._id);
    }
  },
});
