# Supabase → Convex Migration Plan

> Status: **PLANNING ONLY** — nothing in this document has been executed. No
> Convex packages are installed and no code has changed. This is the prep
> work; the actual migration is a follow-up.
>
> Branch: `dev`. Author audit date: 2026-06-27.

---

## 0. TL;DR

King is **localStorage-first with a custom write-ahead log (WAL)**. Supabase is
the cloud-backup / cross-device tier underneath that, plus the auth provider.
The app is single-user.

The good news: the Supabase surface is already **funnelled through a thin infra
layer** (`src/infra/supabase/*`, `src/domains/auth/*`, `src/lib/supabase.ts`,
`src/sdk/{db,cache}.ts`). Almost every feature talks to those wrappers, not to
`supabase-js` directly. That means the migration is mostly **re-implementing a
handful of wrapper modules behind unchanged signatures**, not a rewrite of every
caller.

The hard parts are:
1. **Auth.** Supabase ships email/password + magic-link + password-reset with
   its own SMTP. Convex Auth needs you to bring an email provider (Resend) for
   magic-link and password-reset. Also, Convex Auth's first-class bindings are
   React; this app is mostly vanilla TS, so the client wiring needs care.
2. **The WAL / polling-sync model.** Convex's reactive queries replace the 30s
   polling + last-writer-wins merge. The WAL itself still earns its keep for
   hard-crash durability. Details in §6.
3. **Data migration** of the existing single user's rows from Postgres → Convex.

---

## 1. Current Supabase usage (audit)

### 1.1 The dependency

`package.json` has exactly one Supabase dependency:

```json
"@supabase/supabase-js": "^2.39.0"
```

Env vars (`.env.example`, `vitest.setup.ts`): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`. The client throws on boot if either is missing
(`src/lib/supabase.ts`).

### 1.2 Active tables (5) + RPC guard (1)

| Table             | Purpose                                          | Accessed by                                                            |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `tasks`           | To-Do items (id, text, completed, position, parent_id, updated_at, created_at) | `src/infra/supabase/persistence.ts` → `src/todo.tsx`                  |
| `content_cache`   | Per-(user, content_type, date_key) JSONB cache for AI-generated content | `src/infra/supabase/content-cache.ts` → SDK cache, quote deep-dive, French word-of-day, generators |
| `poetry_recents`  | Last 6 poet/language picks                        | `src/infra/supabase/persistence.ts` → `src/modules/poetry/controller.ts` |
| `french_history`  | French translator history (mode, source, translation, meaning, breakdown) | `src/apps/french-translator/hooks/useHistory.ts`, `useWordOfDay.ts`  |
| `user_modules`    | Custom tiles + built-in overrides + archive state | `src/infra/supabase/module-persistence.ts` → `src/domains/modules/customModules.ts` |
| `legacy_claim_state` (+ `claim_legacy_data()` RPC) | One-shot reattribution of pre-auth anon rows to the first real user | `src/domains/auth/migrate-anon.ts` |

### 1.3 Dead tables (4) — to be dropped, never migrated

These exist only in SQL migrations and the `claim_legacy_data()` RPC body. **No
`src/` code references them** (verified by grep):

- `chat_history`
- `generation_flags`
- `guitar_recent_picks`
- `learning_sessions`

### 1.4 Auth flow

- **Provider:** Supabase Auth, configured in `src/lib/supabase.ts`
  (`persistSession`, `autoRefreshToken`, `detectSessionInUrl` for magic-link
  redirects).
- **Wrappers:** `src/domains/auth/session.ts` exposes `getSession`,
  `signInWithPassword`, `signUpWithPassword`, `signInWithMagicLink` (OTP),
  `resetPasswordForEmail`, `signOut`, `onAuthStateChange`. **Nothing else in
  the app imports `supabase.auth` directly.**
- **Store:** `src/domains/auth/store.ts` — a custom reactive store hydrated from
  `getSession()` and kept in sync via `onAuthStateChange`. The SDK user adapter
  and every module read identity from here.
- **UI:** `src/auth/loginGate.ts` (sign-in / sign-up / magic-link tabs +
  "reset password"), `src/auth/userChip.ts` (email handle + sign-out).
- **Gate:** `src/app/bootstrap.ts` mounts the login gate when there's no
  session and reloads on `SIGNED_IN`; `src/todo.tsx` bounces to `index.html`
  when unauthenticated.
- **Legacy claim:** `src/domains/auth/migrate-anon.ts` calls the
  `claim_legacy_data` RPC once per project (server-guarded + localStorage flag).

### 1.5 Files that touch Supabase

**Direct importers of `supabase` / `supabase-js`:**

| File | What it uses |
| ---- | ------------ |
| `src/lib/supabase.ts` | client singleton |
| `src/lib/supabase.types.ts` | `Json` type placeholder |
| `src/infra/supabase/persistence.ts` | `tasks`, `poetry_recents` |
| `src/infra/supabase/content-cache.ts` | `content_cache` |
| `src/infra/supabase/module-persistence.ts` | `user_modules` |
| `src/apps/french-translator/hooks/useHistory.ts` | `french_history` |
| `src/apps/french-translator/hooks/useWordOfDay.ts` | `french_history` (read) + content-cache wrapper |
| `src/domains/auth/session.ts` | `supabase.auth.*` |
| `src/domains/auth/store.ts` | `Session`/`User` types |
| `src/domains/auth/migrate-anon.ts` | `supabase.rpc('claim_legacy_data')` |
| `src/sdk/db.ts` | exposes raw client via `DBAdapter` |
| `src/sdk/types.ts` | `SupabaseClient` type in `DBAdapter` |

**Indirect consumers** (go through the wrappers — should need *no change* if
wrapper signatures are preserved): `src/sdk/cache.ts`,
`src/components/quoteDeepDive.ts`, `src/infra/ai/generators.ts`,
`src/modules/poetry/controller.ts`, `src/app/bootstrap.ts`,
`src/auth/loginGate.ts`, `src/auth/userChip.ts`, `src/todo.tsx`.

**Tests:** `src/infra/supabase/__tests__/{persistence,content-cache,module-persistence}.test.ts`,
`src/domains/auth/__tests__/session.test.ts`, `src/sdk/__tests__/{sdk,router}.test.ts`.

**Note:** `sdk.db.client()` (the raw-client escape hatch in `src/sdk/db.ts`) is
exposed but **no module actually calls it** (verified by grep). This is the one
place a true Supabase-specific API leaks into the SDK contract; the migration
can drop it or replace it with a typed Convex adapter (see §3.6).

---

## 2. Target Convex schema

Convex gives every document a system `_id` and `_creationTime`, so we don't need
synthetic primary keys or `created_at` for ordering. **However**, the To-Do
module's `task.id` is a **client-generated UUID** that is load-bearing
(WAL merge, upsert-by-id, delete tombstones). We keep it as an explicit
`clientId` field rather than leaning on Convex `_id`.

Auth tables come from `@convex-dev/auth` via `...authTables` (provides `users`,
`authSessions`, `authAccounts`, etc.).

`convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  tasks: defineTable({
    userId: v.id("users"),
    clientId: v.string(),                 // client UUID — load-bearing
    text: v.string(),
    completed: v.boolean(),
    position: v.number(),
    parentId: v.union(v.string(), v.null()),
    updatedAt: v.string(),                // ISO, client-authoritative (LWW)
    createdAt: v.string(),                // ISO
  })
    .index("by_user", ["userId"])
    .index("by_user_client", ["userId", "clientId"]),

  contentCache: defineTable({
    userId: v.id("users"),
    contentType: v.string(),              // e.g. "quote-deep-dive", "<moduleId>:<type>"
    dateKey: v.string(),
    content: v.any(),                     // JSONB equivalent
    updatedAt: v.string(),
  }).index("by_user_type_date", ["userId", "contentType", "dateKey"]),

  poetryRecents: defineTable({
    userId: v.id("users"),
    poet: v.string(),
    language: v.string(),
    timestamp: v.number(),
  }).index("by_user_timestamp", ["userId", "timestamp"]),

  frenchHistory: defineTable({
    userId: v.id("users"),
    mode: v.union(v.literal("en-to-fr"), v.literal("fr-to-en")),
    sourceText: v.string(),
    translation: v.string(),
    meaning: v.string(),
    breakdown: v.any(),                   // array of breakdown rows
  }).index("by_user", ["userId"]),

  userModules: defineTable({
    userId: v.id("users"),
    moduleId: v.string(),                 // "custom-…" or registry id
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
```

**Schema mapping notes**

- Postgres `UNIQUE(user_id, content_type, date_key)` and
  `UNIQUE(user_id, module_id)` have no declarative equivalent in Convex.
  Uniqueness becomes the responsibility of the **mutation**: look up by the
  index, then patch-or-insert. This matches what the current upserts already do
  logically.
- RLS disappears. Convex has no row-level security; **every query/mutation
  filters by the authenticated `userId`** (from `ctx.auth`/the auth helper)
  server-side. This is strictly safer than RLS-by-convention and removes the
  whole "anon UUID vs auth.uid()" saga.
- `breakdown` / `content` use `v.any()` to mirror JSONB. Could be tightened to a
  real validator later.
- `legacy_claim_state` + `claim_legacy_data()` RPC are **not ported**. The
  legacy anon-data claim was a one-time Postgres event; on Convex we seed the
  single user's data directly (see §7) so there's nothing to "claim".

---

## 3. Query-by-query mapping

Convex primitives: **`query`** (reactive, read-only), **`mutation`**
(transactional write), **`action`** (side-effects / external calls, no direct
DB — calls `runQuery`/`runMutation`). All live under `convex/`. The browser
calls them by reference (`api.tasks.list`, etc.).

### 3.1 Tasks (`convex/tasks.ts`)

| Current (`persistence.ts`) | Convex equivalent | Kind |
| -------------------------- | ----------------- | ---- |
| `loadTasks(userId)` — `select … eq user_id order position` | `list` — `db.query("tasks").withIndex("by_user", q => q.eq("userId", uid)).collect()`, sort by position; map `clientId`→`id` | **query** |
| `saveTasks(userId, tasks, deletedIds)` — upsert on `id` + delete `in(deletedIds)` | `save({ tasks, deletedIds })` — for each task, `withIndex("by_user_client")` lookup → `patch` or `insert`; for each deletedId, look up and `delete` (cascade children by `parentId` in the same mutation) | **mutation** |
| `replaceAllForUser(table, …)` (poetry only) | not needed for tasks | — |

`userId` is taken from the authenticated context, **not** a client argument
(removes the spoofing surface RLS used to cover).

### 3.2 Content cache (`convex/contentCache.ts`)

| Current (`content-cache.ts`) | Convex equivalent | Kind |
| ---------------------------- | ----------------- | ---- |
| `getCachedContent(userId, type, dateKey)` | `get({ contentType, dateKey })` — `withIndex("by_user_type_date").unique()`; return `content ?? null` | **query** |
| `saveCachedContent(userId, type, dateKey, content)` | `set({ contentType, dateKey, content })` — lookup → `patch` or `insert` | **mutation** |

Keep the `getCachedContent`/`saveCachedContent` wrapper signatures so
`src/sdk/cache.ts`, `quoteDeepDive.ts`, `generators.ts`, and `useWordOfDay.ts`
don't change.

### 3.3 Poetry (`convex/poetry.ts`)

| Current | Convex equivalent | Kind |
| ------- | ----------------- | ---- |
| `loadPoetryRecents(userId)` — order timestamp desc limit 6 | `list` — `withIndex("by_user_timestamp").order("desc").take(6)` | **query** |
| `savePoetryRecents(userId, recents)` (delete-all + insert) | `replace({ recents })` — delete the user's rows, insert the new set, in one mutation | **mutation** |

`recordPoetrySelection()` stays a pure client function — no change.

### 3.4 French history (`convex/frenchHistory.ts`)

| Current (`useHistory.ts` / `useWordOfDay.ts`) | Convex equivalent | Kind |
| --------------------------------------------- | ----------------- | ---- |
| load 50 most recent | `list` — `withIndex("by_user").order("desc").take(50)` | **query** |
| insert one entry | `add({ mode, sourceText, translation, meaning, breakdown })` | **mutation** |
| clear all | `clear()` — delete all of the user's rows | **mutation** |
| `fetchLearnedWords` (200 most recent `source_text`) | `learnedWords` — `withIndex("by_user").order("desc").take(200)`, project `sourceText` | **query** |

This is also the cleanest place to **swap polling for reactivity**: the React
hook becomes `useQuery(api.frenchHistory.list)` and updates live after `add`.

### 3.5 User modules (`convex/userModules.ts`)

| Current (`module-persistence.ts`) | Convex equivalent | Kind |
| --------------------------------- | ----------------- | ---- |
| `loadCustomModulesFromSupabase` (is_custom=true) | `listCustom` — `by_user_custom` index, `eq(isCustom, true)`, order position | **query** |
| `loadOverridesFromSupabase` (is_custom=false) | `listOverrides` — `by_user_custom`, `eq(isCustom, false)` | **query** |
| `loadArchivedFromSupabase` (archived_at not null) | `listArchived` — `by_user`, filter `archivedAt !== null` | **query** |
| `saveCustomModuleToSupabase` / `update…` (upsert on user_id,module_id) | `upsertModule({ … })` — `by_user_module` lookup → patch/insert | **mutation** |
| `deleteCustomModuleFromSupabase` | `deleteModule({ moduleId })` | **mutation** |
| `saveOverrideToSupabase` (delete if empty, else upsert) | `saveOverride({ moduleId, patch })` | **mutation** |
| `setArchivedInSupabase` (update, else insert placeholder) | `setArchived({ moduleId, archived, category?, isCustom? })` | **mutation** |
| `migrateLocalStorageToSupabase` (bulk upsert) | `bulkUpsert({ rows })` | **mutation** |

### 3.6 SDK DB adapter (`src/sdk/db.ts`, `src/sdk/types.ts`)

Currently exposes the **raw `SupabaseClient`** as `sdk.db.client()`. **Unused by
every module.** Two options:

- **(Recommended) Drop the `db` adapter** from the SDK surface entirely
  (`KingSDK.db`, `DBAdapter`, `createDBAdapter`, `sdk/db.ts`). It leaks a
  vendor type into the contract and nothing depends on it.
- Or replace it with a typed Convex client (`ConvexClient` from
  `convex/browser`) if we want to keep a generic escape hatch.

### 3.7 Auth (`convex/auth.ts` via `@convex-dev/auth`) — see §4.

### 3.8 Legacy claim — **deleted**, not mapped. See §2 notes and §5.

---

## 4. Auth migration path (Convex Auth)

**Library:** `@convex-dev/auth` (Convex's built-in auth). Maps to the current
flow as follows:

| Current (Supabase) | Convex Auth |
| ------------------ | ----------- |
| `signInWithPassword` / `signUpWithPassword` | **Password** provider (`@convex-dev/auth/providers/Password`). Sign-up + sign-in are the same provider with `flow: "signUp"` / `"signIn"`. |
| `signInWithMagicLink` (OTP) | **Email magic-link** provider — requires an external email sender (e.g. Resend) configured as a Convex Auth email provider. |
| `resetPasswordForEmail` | Password provider's **`reset`/`reset-verification`** flow — also requires the email sender. |
| `signOut` | `signOut()` from the auth client. |
| `getSession` / `onAuthStateChange` | `isAuthenticated` / `isLoading` + the current user query (`api.auth.loggedInUser` style helper). The custom `store.ts` hydrates from these instead of `supabase.auth`. |
| `detectSessionInUrl` (magic-link redirect) | Convex Auth handles the verification callback; the redirect lands back on the app and the auth state flips. |

**Two real caveats** (call them out to the user):

1. **Email provider required.** Supabase bundled SMTP. Convex Auth does **not**
   send email itself — magic-link and password-reset need an email provider
   (Resend is the documented default; free tier exists). **Password-only
   sign-in works with no email provider** if email verification is off. So a
   minimal first cut can ship password-only and add magic-link once Resend is
   wired.

2. **Vanilla-JS wiring.** Convex Auth's first-class bindings are **React**
   (`ConvexAuthProvider`, `useAuthActions`). This app is mostly vanilla
   TS/DOM with a single React island (the French translator). Options:
   - Wire Convex Auth through the existing custom `store.ts` using the
     lower-level `@convex-dev/auth` client + `ConvexClient` from
     `convex/browser`, manually persisting the auth token to localStorage and
     re-hydrating on boot. More work but keeps the vanilla architecture.
   - Or, since the app is **single-user**, a lighter-weight auth could be
     considered — but the brief says use Convex's built-in auth, so the plan
     assumes Convex Auth via the custom store.

   Either way, the **wrapper surface in `src/domains/auth/session.ts` stays the
   same** (`signInWithPassword`, `signInWithMagicLink`, etc.), so `loginGate.ts`
   / `userChip.ts` / `bootstrap.ts` don't change — only the wrapper internals.

**Files added:** `convex/auth.ts` (providers config), `convex/auth.config.ts`
(auth config), `convex/http.ts` (auth HTTP routes). **Files re-implemented:**
`src/domains/auth/session.ts`, `src/domains/auth/store.ts` (type imports +
hydration source).

---

## 5. localStorage-first / WAL — does it still make sense?

**Short answer: keep the WAL, retire the polling + LWW merge.**

What each current mechanism does and its fate under Convex:

| Mechanism | Today | Under Convex | Verdict |
| --------- | ----- | ------------ | ------- |
| **WAL** (`src/domains/todo/wal.ts`) — full task list written to localStorage *before* the network save | Survives crash/close/offline; replayed + merged on next boot | Convex's client mutation queue is **in-memory only** — it retries while the tab lives, but a hard close/crash before flush loses it. **The WAL still covers exactly that gap.** | **KEEP** (thin) |
| **30s polling sync** (`setInterval(runSync)` in `todo.tsx`) | Re-reads server, merges by id | **Replace with a Convex reactive query** (`onUpdate` subscription) — the server pushes changes in real time; no polling. | **REPLACE** |
| **`mergeTasks` LWW merge** (`src/domains/todo/model.ts`) | Reconciles local vs server, last-writer-wins by `updated_at`, honours delete tombstones | With a reactive single source of truth, day-to-day merging is gone. **Still needed once: at boot, to replay a WAL that survived a crash against the first reactive snapshot.** | **KEEP, but only on boot-replay** |
| **`SaveController`** (retry/backoff, dirty tracking, offline status) | Serializes saves, retries, shows "offline — saved locally" | Convex mutations retry automatically; much of the backoff is redundant. The **UX state** (saving / saved / offline) and **WAL-clear-on-confirm** still matter. | **SIMPLIFY** — keep status + WAL clear, lean on Convex for retry |
| **`canSync` interaction guards** | Block merges mid-edit/drag | With Convex optimistic updates the local state is authoritative during an edit; reactive server pushes still need to not clobber an in-flight edit, so a lighter version of the guard remains. | **KEEP (lighter)** |

The **module store** (`customModules.ts`) is already a localStorage
write-through cache that paints synchronously then refreshes from the network.
That pattern works fine over Convex too — the background refresh just becomes a
Convex query. Optionally it can later move to a reactive subscription, but
that's not required for the migration.

Net: the migration is a chance to **delete the 30s poll and most of the merge
machinery**, while keeping the WAL as a small crash-durability insurance layer.

---

## 6. Dead tables to delete

These four are unreferenced by any `src/` code and should **not** be ported to
Convex. They only need cleanup on the Supabase side (and removal from the RPC):

1. `chat_history`
2. `generation_flags`
3. `guitar_recent_picks`
4. `learning_sessions`

Cleanup work:
- Don't add them to `convex/schema.ts` (already excluded above).
- Their references in `claim_legacy_data()` are moot — that whole RPC is dropped.
- Optionally drop them from Supabase before decommissioning (or just delete the
  Supabase project at the end). The migrations that created them
  (`20260111154628_add_learning_sessions.sql`, the dead-table blocks in
  `supabase-schema.sql`, etc.) stay in git history but become inert.

---

## 7. Existing-data migration (single user)

Because it's one user, this is small:

1. **Export** the 5 active tables from Supabase (SQL editor → CSV/JSON, or
   `pg_dump --data-only` per table).
2. **Transform** column names to the Convex field names (snake_case → camelCase;
   `id`→`clientId` for tasks; resolve the single `user_id` to the new Convex
   `users` `_id` after the bootstrap user is created).
3. **Load** via either `npx convex import --table <name> <file.jsonl>` or a
   one-off seeding mutation in `convex/seed.ts` that takes the exported JSON.
   A seeding mutation is easier here because it lets us look up/attach the new
   `userId` and run the same patch-or-insert logic.

Verification: after import, sign in and confirm tasks, poetry recents, French
history, custom modules/overrides/archive state, and cached content all appear.

---

## 8. File-by-file change list

### 8.1 Files to CREATE (`convex/` directory)

| File | Purpose | Effort |
| ---- | ------- | ------ |
| `convex/schema.ts` | Schema from §2 | S |
| `convex/auth.ts` | Convex Auth providers (Password [+ Resend email later]) | M |
| `convex/auth.config.ts` | Auth config | S |
| `convex/http.ts` | Auth HTTP routes | S |
| `convex/tasks.ts` | `list` query, `save` mutation (§3.1) | M |
| `convex/contentCache.ts` | `get` query, `set` mutation (§3.2) | S |
| `convex/poetry.ts` | `list` query, `replace` mutation (§3.3) | S |
| `convex/frenchHistory.ts` | `list`, `learnedWords` queries; `add`, `clear` mutations (§3.4) | M |
| `convex/userModules.ts` | module queries + mutations (§3.5) | M |
| `convex/seed.ts` | one-off data import mutation (§7) | M |
| `convex/_generated/*` | auto-generated by `npx convex dev` | — |
| `convex/tsconfig.json` | Convex's TS config | S |

### 8.2 Files to MODIFY (swap Supabase internals; keep signatures)

| File | Change | Effort |
| ---- | ------ | ------ |
| `src/lib/supabase.ts` | Replace with `src/lib/convex.ts` exporting a `ConvexClient` (`convex/browser`); update env-var guard to `VITE_CONVEX_URL` | S |
| `src/lib/supabase.types.ts` | Delete or replace with generated Convex types | S |
| `src/infra/supabase/persistence.ts` | Re-implement `loadTasks`/`saveTasks`/poetry over Convex client; **keep exported signatures** | M |
| `src/infra/supabase/content-cache.ts` | Re-implement `get/saveCachedContent` over Convex; keep signatures | S |
| `src/infra/supabase/module-persistence.ts` | Re-implement all module fns over Convex; keep signatures | M |
| `src/domains/auth/session.ts` | Re-implement auth wrappers over Convex Auth; keep signatures | M |
| `src/domains/auth/store.ts` | Hydrate from Convex Auth state instead of `supabase.auth`; replace `Session`/`User` types | M |
| `src/domains/auth/migrate-anon.ts` | **Delete** (legacy claim not ported) — and drop its call in `bootstrap.ts` | S |
| `src/sdk/db.ts` | Delete (recommended) or re-point to Convex client | S |
| `src/sdk/types.ts` | Remove `SupabaseClient` import + `DBAdapter` (or retype) | S |
| `src/sdk/index.ts` | Drop `db: createDBAdapter()` if adapter removed | S |
| `src/app/bootstrap.ts` | Remove `claimLegacyDataIfNeeded()` call; auth-gate logic unchanged otherwise | S |
| `src/apps/french-translator/hooks/useHistory.ts` | Replace direct `supabase.from('french_history')` calls with Convex (ideally `useQuery`/`useMutation` for live history) | M |
| `src/apps/french-translator/hooks/useWordOfDay.ts` | Replace `fetchLearnedWords` Supabase query with Convex query; cache wrapper unchanged | S |
| `src/todo.tsx` | Replace 30s poll + `mergeTasks` day-to-day path with a Convex reactive subscription; keep WAL boot-replay; simplify `SaveController` usage (§5) | **L** |
| `src/domains/todo/save-controller.ts` | Simplify to lean on Convex retry; keep status + WAL-clear | M |
| `package.json` | Remove `@supabase/supabase-js`; add `convex`, `@convex-dev/auth` (+ `@auth/core`, Resend if email) | S |
| `vite.config.ts` | No entry changes; env var rename only if referenced | S |
| `.env.example`, `vitest.setup.ts` | Swap `VITE_SUPABASE_*` → `VITE_CONVEX_URL` | S |

### 8.3 Files to DELETE

| File | Reason |
| ---- | ------ |
| `src/lib/supabase.ts` | Replaced by `src/lib/convex.ts` |
| `src/lib/supabase.types.ts` | Replaced by generated Convex types |
| `src/domains/auth/migrate-anon.ts` | Legacy anon-claim not ported |
| `src/sdk/db.ts` | Raw-client adapter, unused |
| `supabase-schema.sql`, `supabase-migration-*.sql`, `supabase/migrations/**`, `supabase/` config | Supabase backend retired (keep until data export verified) |
| `.env` Supabase keys | After cutover |

**Dead-table cleanup** (already not in `src/`): nothing to delete in code; just
don't recreate `chat_history` / `generation_flags` / `guitar_recent_picks` /
`learning_sessions` in Convex.

### 8.4 Tests to update

| File | Change |
| ---- | ------ |
| `src/infra/supabase/__tests__/persistence.test.ts` | Re-target at the Convex-backed `persistence.ts`; mock the Convex client instead of `supabase` |
| `src/infra/supabase/__tests__/content-cache.test.ts` | Same |
| `src/infra/supabase/__tests__/module-persistence.test.ts` | Same |
| `src/domains/auth/__tests__/session.test.ts` | Mock Convex Auth instead of `supabase.auth` |
| `src/sdk/__tests__/{sdk,router}.test.ts` | Drop the Supabase-env mock; adjust if `db` adapter removed |
| `src/domains/todo/__tests__/{wal,save-controller}.test.ts` | Mostly unchanged (pure modules); adjust if `SaveController` simplified |
| `vitest.setup.ts` | Swap env stubs |

Consider renaming the `src/infra/supabase/` directory to `src/infra/convex/`
(and `__tests__` with it) once the dust settles — optional, cosmetic.

---

## 9. Effort estimate (rough)

| Phase | Scope | Estimate |
| ----- | ----- | -------- |
| 0. Setup | Install Convex, `npx convex dev`, env wiring, `convex/schema.ts` | 0.5 day |
| 1. Data functions | `tasks`, `contentCache`, `poetry`, `frenchHistory`, `userModules` queries/mutations | 1–1.5 days |
| 2. Infra re-impl | Re-implement the 3 infra wrappers + `lib/convex.ts` behind unchanged signatures | 1 day |
| 3. Auth | Convex Auth wiring through the custom store (password first), `session.ts`/`store.ts` re-impl | 1–2 days |
| 4. Magic-link + reset email | Resend provider config + flows | 0.5 day |
| 5. To-Do reactivity | Replace poll/merge with subscription, keep WAL boot-replay, simplify SaveController | 1–1.5 days |
| 6. French hooks reactivity | `useHistory`/`useWordOfDay` over Convex (React `useQuery`) | 0.5 day |
| 7. Data migration | Export → transform → seed the single user | 0.5 day |
| 8. Tests | Re-point infra + auth tests; adjust setup | 1 day |
| 9. Cleanup | Delete Supabase files, drop dep, decommission project | 0.5 day |
| **Total** | | **~8–10 days** |

The single biggest risk/effort item is **§3 To-Do reactivity** (`todo.tsx` is
~950 lines and its sync/save model is intricate) and **auth wiring in a vanilla
app**. Everything else is mechanical wrapper-swapping.

---

## 10. What the user needs to do

1. **Create a Convex account & project** — sign up at convex.dev (free tier is
   fine for single-user). Then in the repo: `npm i convex @convex-dev/auth` and
   run `npx convex dev`. This provisions a dev deployment and writes
   `CONVEX_DEPLOYMENT` + `VITE_CONVEX_URL` into `.env.local`. (No manual API
   keys to copy for the DB — the CLI handles it.)
2. **For magic-link + password reset:** create a **Resend** account, get an API
   key, and add it as a Convex environment variable (e.g.
   `npx convex env set AUTH_RESEND_KEY <key>`). *(Optional for a password-only
   first cut.)*
3. **Set the Convex Auth signing keys** — `npx @convex-dev/auth` runs a setup
   that generates `JWT_PRIVATE_KEY` / `JWKS` env vars on the deployment.
4. **Provide Supabase data export** (or grant access to run it) so the existing
   user's tasks/poetry/French/modules/cache can be seeded into Convex.
5. **Decide the auth cutover**: password-only first (no email dependency), then
   add magic-link once Resend is configured — or do both at once.
6. **Production deployment:** run `npx convex deploy` for the prod deployment and
   set `VITE_CONVEX_URL` in the Vercel/hosting env before the frontend cutover.
7. **After verification:** decommission the Supabase project and remove its
   keys.

---

## 11. Open questions to resolve before execution

- **Auth model:** full Convex Auth via the custom vanilla store (assumed here),
  or a lighter single-user scheme? Brief says Convex built-in → plan assumes it.
- **Magic-link in scope for v1**, or ship password-only first?
- **Keep the SDK `db` adapter** as a typed Convex escape hatch, or delete it
  (recommended — unused)?
- **Rename `src/infra/supabase/` → `src/infra/convex/`** now, or leave the path
  and just swap internals to minimize diff?
- **Module store:** leave as localStorage-write-through-over-Convex, or upgrade
  to a reactive subscription too?
```
