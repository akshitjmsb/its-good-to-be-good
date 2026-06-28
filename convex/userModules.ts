/**
 * User modules. Maps the old `user_modules` table: custom tiles
 * (isCustom=true), built-in overrides (isCustom=false), and archive state.
 * Uniqueness on (userId, moduleId) is enforced here via upsert.
 */
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { type Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const category = v.union(v.literal("journey"), v.literal("learn"));

export const listCustom = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("userModules")
      .withIndex("by_user_custom", (q) =>
        q.eq("userId", userId).eq("isCustom", true)
      )
      .collect();
    rows.sort((a, b) => a.position - b.position);

    return rows.map((r) => ({
      moduleId: r.moduleId,
      displayName: r.displayName,
      emoji: r.emoji,
      category: r.category,
      createdAt: r.createdAt,
    }));
  },
});

export const listOverrides = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("userModules")
      .withIndex("by_user_custom", (q) =>
        q.eq("userId", userId).eq("isCustom", false)
      )
      .collect();

    return rows.map((r) => ({
      moduleId: r.moduleId,
      displayName: r.displayName,
      emoji: r.emoji,
    }));
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("userModules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows.filter((r) => r.archivedAt !== null).map((r) => r.moduleId);
  },
});

function findRow(ctx: MutationCtx, userId: Id<"users">, moduleId: string) {
  return ctx.db
    .query("userModules")
    .withIndex("by_user_module", (q) =>
      q.eq("userId", userId).eq("moduleId", moduleId)
    )
    .unique();
}

export const upsertModule = mutation({
  args: {
    moduleId: v.string(),
    displayName: v.string(),
    emoji: v.string(),
    category,
    isCustom: v.boolean(),
    position: v.number(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await findRow(ctx, userId, args.moduleId);
    const doc = {
      userId,
      moduleId: args.moduleId,
      displayName: args.displayName,
      emoji: args.emoji,
      category: args.category,
      isCustom: args.isCustom,
      position: args.position,
      createdAt: args.createdAt,
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("userModules", { ...doc, archivedAt: null });
    }
  },
});

export const deleteModule = mutation({
  args: { moduleId: v.string() },
  handler: async (ctx, { moduleId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await findRow(ctx, userId, moduleId);
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const saveOverride = mutation({
  args: {
    moduleId: v.string(),
    displayName: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, { moduleId, displayName, emoji }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await findRow(ctx, userId, moduleId);

    // Both fields cleared → remove the override entirely.
    if (!displayName && !emoji) {
      if (existing && !existing.isCustom) await ctx.db.delete(existing._id);
      return;
    }

    const doc = {
      userId,
      moduleId,
      displayName,
      emoji,
      category: "learn" as const,
      isCustom: false,
      position: 0,
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("userModules", {
        ...doc,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

export const setArchived = mutation({
  args: {
    moduleId: v.string(),
    archived: v.boolean(),
    category: v.optional(category),
    isCustom: v.optional(v.boolean()),
  },
  handler: async (ctx, { moduleId, archived, category: cat, isCustom }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const archivedAt = archived ? new Date().toISOString() : null;
    const existing = await findRow(ctx, userId, moduleId);

    if (existing) {
      await ctx.db.patch(existing._id, { archivedAt });
      return;
    }

    // No row yet — only meaningful when archiving (placeholder row).
    if (!archived) return;

    await ctx.db.insert("userModules", {
      userId,
      moduleId,
      displayName: "",
      emoji: "",
      category: cat ?? "learn",
      isCustom: isCustom ?? false,
      position: 0,
      archivedAt,
      createdAt: new Date().toISOString(),
    });
  },
});

export const bulkUpsert = mutation({
  args: {
    rows: v.array(
      v.object({
        moduleId: v.string(),
        displayName: v.string(),
        emoji: v.string(),
        category,
        isCustom: v.boolean(),
        position: v.number(),
        createdAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { rows }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    for (const row of rows) {
      const existing = await findRow(ctx, userId, row.moduleId);
      const doc = {
        userId,
        moduleId: row.moduleId,
        displayName: row.displayName,
        emoji: row.emoji,
        category: row.category,
        isCustom: row.isCustom,
        position: row.position,
        createdAt: row.createdAt ?? new Date().toISOString(),
      };
      if (existing) {
        await ctx.db.patch(existing._id, doc);
      } else {
        await ctx.db.insert("userModules", { ...doc, archivedAt: null });
      }
    }
  },
});
