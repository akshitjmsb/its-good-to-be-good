/**
 * Convex schema for "It's Good To Be King".
 *
 * Mirrors the five active Supabase tables (tasks, content_cache,
 * poetry_recents, french_history, user_modules) and adds Convex Auth's
 * tables via `...authTables` (users, authSessions, authAccounts, …).
 *
 * Notes vs. the old Postgres schema:
 *  - Every doc gets a system `_id` and `_creationTime`, so synthetic primary
 *    keys / created_at columns are unnecessary — EXCEPT `tasks.clientId`, the
 *    client-generated UUID that is load-bearing for the To-Do WAL merge,
 *    upsert-by-id, and delete tombstones. It is stored as an explicit field.
 *  - Postgres UNIQUE(...) constraints have no declarative equivalent;
 *    uniqueness is enforced inside the mutations (look up by index, then
 *    patch-or-insert).
 *  - RLS is gone. Every query/mutation filters by the authenticated user id
 *    (`getAuthUserId`) server-side, which is strictly safer than RLS-by-policy.
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
    completed: v.boolean(),
    position: v.number(),
    parentId: v.union(v.string(), v.null()),
    updatedAt: v.string(), // ISO, client-authoritative (last-writer-wins)
    createdAt: v.string(), // ISO
  })
    .index("by_user", ["userId"])
    .index("by_user_client", ["userId", "clientId"]),

  // 2. Per-(user, content_type, date_key) JSONB cache for AI content.
  contentCache: defineTable({
    userId: v.id("users"),
    contentType: v.string(),
    dateKey: v.string(),
    content: v.any(),
    updatedAt: v.string(),
  }).index("by_user_type_date", ["userId", "contentType", "dateKey"]),

  // 3. Last few poet/language picks.
  poetryRecents: defineTable({
    userId: v.id("users"),
    poet: v.string(),
    language: v.string(),
    timestamp: v.number(),
  }).index("by_user_timestamp", ["userId", "timestamp"]),

  // 4. French translator history.
  frenchHistory: defineTable({
    userId: v.id("users"),
    mode: v.union(v.literal("en-to-fr"), v.literal("fr-to-en")),
    sourceText: v.string(),
    translation: v.string(),
    meaning: v.string(),
    breakdown: v.any(),
  }).index("by_user", ["userId"]),

  // 5. Custom tiles + built-in overrides + archive state.
  userModules: defineTable({
    userId: v.id("users"),
    moduleId: v.string(),
    displayName: v.string(),
    emoji: v.string(),
    category: v.union(v.literal("journey"), v.literal("learn")),
    isCustom: v.boolean(),
    position: v.number(),
    archivedAt: v.union(v.string(), v.null()),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_module", ["userId", "moduleId"])
    .index("by_user_custom", ["userId", "isCustom"]),
});
