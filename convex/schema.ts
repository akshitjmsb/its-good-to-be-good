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

  // Revocable service credentials let the owner's local Jarvis backend use a
  // deliberately narrow To-Do API without borrowing a browser session. Only a
  // SHA-256 digest is stored; the plaintext credential is shown once in the
  // authenticated To-Do UI and remains on the owner's Mac mini.
  jarvisTodoCredentials: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    label: v.string(),
    scopes: v.array(v.string()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_user", ["userId"]),

  // One receipt per user/request id makes every Jarvis mutation idempotent and
  // leaves an owner-scoped before/after record. Reusing an id for different
  // content is rejected rather than silently performing a second action.
  jarvisTodoCommandReceipts: defineTable({
    userId: v.id("users"),
    credentialId: v.id("jarvisTodoCredentials"),
    requestId: v.string(),
    requestHash: v.string(),
    action: v.string(),
    state: v.string(),
    responseJson: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_request", ["userId", "requestId"])
    .index("by_user_created", ["userId", "createdAt"]),
});
