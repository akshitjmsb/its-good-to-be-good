/**
 * Convex schema for "It's Good To Be King".
 *
 * One app table (tasks) plus Convex Auth's tables via `...authTables`
 * (users, authSessions, authAccounts, …). The 2026 orbit reorg dropped
 * the content-cache / poetry / french / user-modules tables along with
 * their features (data exported to backups/ before removal).
 *
 * Notes:
 *  - Every doc gets a system `_id` and `_creationTime` — EXCEPT
 *    `tasks.clientId`, the client-generated UUID that is load-bearing for
 *    the To-Do WAL merge, upsert-by-id, and delete tombstones.
 *  - Uniqueness is enforced inside the mutations (look up by index, then
 *    patch-or-insert).
 *  - Every query/mutation filters by the authenticated user id
 *    (`getAuthUserId`) server-side; never trust a client-supplied id.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // 1. To-Do items.
  tasks: defineTable({
    userId: v.id("users"),
    clientId: v.string(), // client-generated UUID — load-bearing
    text: v.string(),
    // Optional preserves existing tasks while the note editor rolls out.
    note: v.optional(v.string()),
    completed: v.boolean(),
    position: v.number(),
    parentId: v.union(v.string(), v.null()),
    updatedAt: v.string(), // ISO, client-authoritative (last-writer-wins)
    createdAt: v.string(), // ISO
  })
    .index("by_user", ["userId"])
    .index("by_user_client", ["userId", "clientId"]),

  // Delete tombstones stop a stale offline snapshot from recreating a task
  // that was intentionally removed on another device. They are cheap and
  // retain only the id + deletion revision, never the note content itself.
  taskTombstones: defineTable({
    userId: v.id("users"),
    clientId: v.string(),
    deletedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_client", ["userId", "clientId"]),
});
