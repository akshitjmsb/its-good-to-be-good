/**
 * Tasks (To-Do). Maps the old `tasks` table.
 *
 * Identity comes from the authenticated context, never from a client argument
 * — so there is no way to read or write another user's tasks. Each task keeps
 * its client-generated `clientId`; `save` is an upsert keyed on it plus
 * explicit delete tombstones (never "delete everything not in my list").
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const taskInput = v.object({
  clientId: v.string(),
  text: v.string(),
  completed: v.boolean(),
  position: v.number(),
  parentId: v.union(v.string(), v.null()),
  updatedAt: v.string(),
  createdAt: v.string(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rows = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    rows.sort((a, b) => a.position - b.position);

    return rows.map((r) => ({
      id: r.clientId,
      text: r.text,
      completed: r.completed,
      position: r.position,
      parentId: r.parentId,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    }));
  },
});

export const save = mutation({
  args: {
    tasks: v.array(taskInput),
    deletedIds: v.array(v.string()),
  },
  handler: async (ctx, { tasks, deletedIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Upsert keyed on (userId, clientId).
    for (const t of tasks) {
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_user_client", (q) =>
          q.eq("userId", userId).eq("clientId", t.clientId)
        )
        .unique();

      const doc = {
        userId,
        clientId: t.clientId,
        text: t.text,
        completed: t.completed,
        position: t.position,
        parentId: t.parentId,
        updatedAt: t.updatedAt,
        createdAt: t.createdAt,
      };

      if (existing) {
        await ctx.db.patch(existing._id, doc);
      } else {
        await ctx.db.insert("tasks", doc);
      }
    }

    // Delete exactly the tombstoned ids, plus any of their children.
    if (deletedIds.length > 0) {
      const delSet = new Set(deletedIds);
      const rows = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const r of rows) {
        if (delSet.has(r.clientId) || (r.parentId && delSet.has(r.parentId))) {
          await ctx.db.delete(r._id);
        }
      }
    }
  },
});
