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
  note: v.optional(v.string()),
  completed: v.boolean(),
  position: v.number(),
  parentId: v.union(v.string(), v.null()),
  updatedAt: v.string(),
  createdAt: v.string(),
});

const deleteInput = v.object({
  clientId: v.string(),
  deletedAt: v.string(),
});

/** Invalid timestamps never get to replace an otherwise valid record. */
function isStrictlyNewer(incoming: string, existing: string): boolean {
  const incomingMs = Date.parse(incoming);
  const existingMs = Date.parse(existing);
  if (Number.isNaN(incomingMs)) return false;
  if (Number.isNaN(existingMs)) return true;
  return incomingMs > existingMs;
}

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
      note: r.note ?? "",
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
    deleted: v.array(deleteInput),
  },
  handler: async (ctx, { tasks, deleted }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Read the user's compact data set once. This lets a single mutation
    // apply an atomic-looking conflict policy without issuing N lookups.
    const rows = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const tombstoneRows = await ctx.db
      .query("taskTombstones")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const tasksByClient = new Map(rows.map(row => [row.clientId, row]));
    const tombstonesByClient = new Map(tombstoneRows.map(row => [row.clientId, row]));

    // Delete exactly the explicit records, plus a deleted parent's existing
    // children. Every removed id gets a revisioned tombstone, preventing an
    // old offline full snapshot from bringing a note back unexpectedly.
    const deleteByClient = new Map(deleted.map(record => [record.clientId, record]));
    for (const row of rows) {
      const parentDelete = row.parentId ? deleteByClient.get(row.parentId) : undefined;
      if (parentDelete && !deleteByClient.has(row.clientId)) {
        deleteByClient.set(row.clientId, {
          clientId: row.clientId,
          deletedAt: parentDelete.deletedAt,
        });
      }
    }

    for (const deletion of deleteByClient.values()) {
      const existing = tasksByClient.get(deletion.clientId);
      // An edit made after a delete is an intentional recreation; an older
      // delete must not erase that newer work.
      if (existing && isStrictlyNewer(existing.updatedAt, deletion.deletedAt)) continue;

      if (existing) {
        await ctx.db.delete(existing._id);
        tasksByClient.delete(deletion.clientId);
      }

      const priorTombstone = tombstonesByClient.get(deletion.clientId);
      if (priorTombstone) {
        if (isStrictlyNewer(deletion.deletedAt, priorTombstone.deletedAt)) {
          await ctx.db.patch(priorTombstone._id, { deletedAt: deletion.deletedAt });
          tombstonesByClient.set(deletion.clientId, {
            ...priorTombstone,
            deletedAt: deletion.deletedAt,
          });
        }
      } else {
        const tombstoneId = await ctx.db.insert("taskTombstones", {
          userId,
          clientId: deletion.clientId,
          deletedAt: deletion.deletedAt,
        });
        tombstonesByClient.set(deletion.clientId, {
          _id: tombstoneId,
          _creationTime: Date.now(),
          userId,
          clientId: deletion.clientId,
          deletedAt: deletion.deletedAt,
        });
      }
    }

    // Upsert only when the incoming revision is newer. A full client
    // snapshot necessarily contains records the user did not touch, so this
    // comparison is what stops it from overwriting a newer edit on another
    // device.
    for (const task of tasks) {
      if (deleteByClient.has(task.clientId)) continue;

      const tombstone = tombstonesByClient.get(task.clientId);
      if (tombstone) {
        if (!isStrictlyNewer(task.updatedAt, tombstone.deletedAt)) continue;
        await ctx.db.delete(tombstone._id);
        tombstonesByClient.delete(task.clientId);
      }

      const existing = tasksByClient.get(task.clientId);
      const update = {
        text: task.text,
        note: task.note ?? "",
        completed: task.completed,
        position: task.position,
        parentId: task.parentId,
        updatedAt: task.updatedAt,
      };

      if (existing) {
        if (!isStrictlyNewer(task.updatedAt, existing.updatedAt)) continue;
        await ctx.db.patch(existing._id, update);
      } else {
        const taskId = await ctx.db.insert("tasks", {
          userId,
          clientId: task.clientId,
          createdAt: task.createdAt,
          ...update,
        });
        tasksByClient.set(task.clientId, {
          _id: taskId,
          _creationTime: Date.now(),
          userId,
          clientId: task.clientId,
          createdAt: task.createdAt,
          ...update,
        });
      }
    }
  },
});
