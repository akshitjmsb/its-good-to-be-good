/**
 * Pure, DOM-free task operations for the To Do module.
 *
 * Everything that decides *what the data should become* lives here so it can
 * be unit-tested without a browser: ordering, the parent/child completion
 * cascade, position normalisation, and the non-destructive sync merge. The
 * page entry (`src/modules/todo/entry.ts`) is a thin DOM layer that calls
 * into these.
 */

import type { Task } from '../../types';

/** Parse an ISO `updated_at` into a comparable number; missing → epoch 0. */
function updatedMs(task: Task): number {
  if (!task.updated_at) return 0;
  const t = Date.parse(task.updated_at);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Deterministic ordering within a sibling group: by stored `position`, then
 * `created_at`, then `id`. The id tiebreak guarantees a total order even when
 * positions and timestamps collide, so the list never reshuffles between
 * loads (fixes the "tasks jump around" instability).
 */
function byOrder(a: Task, b: Task): number {
  if (a.position !== b.position) return a.position - b.position;
  const ca = a.created_at ?? '';
  const cb = b.created_at ?? '';
  if (ca !== cb) return ca < cb ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Completed sinks to the bottom; otherwise deterministic order. */
function byDisplay(a: Task, b: Task): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  return byOrder(a, b);
}

/** Top-level tasks in display order (completed sinking to the bottom). */
export function topLevel(tasks: Task[]): Task[] {
  return tasks.filter(t => !t.parent_id).sort(byDisplay);
}

/** A parent's subtasks in display order. */
export function childrenOf(
  tasks: Task[],
  parentId: string | undefined | null
): Task[] {
  if (!parentId) return [];
  return tasks.filter(t => t.parent_id === parentId).sort(byDisplay);
}

/**
 * Normalise positions to a dense 0..n-1 sequence per sibling group, using the
 * deterministic order above. Idempotent for an already-clean list; only
 * collapses ties/gaps. Returns a new array and never mutates the input.
 *
 * Position is intentionally independent of `completed`: the completed-sink is
 * a *display* concern, so toggling completion never rewrites stored positions.
 */
export function reindex(tasks: Task[]): Task[] {
  const next = tasks.map(t => ({ ...t }));

  const roots = next.filter(t => !t.parent_id).sort(byOrder);
  roots.forEach((t, i) => {
    t.position = i;
  });

  const parentIds = new Set(
    next.filter(t => t.parent_id).map(t => t.parent_id as string)
  );
  for (const pid of parentIds) {
    const kids = next.filter(t => t.parent_id === pid).sort(byOrder);
    kids.forEach((t, i) => {
      t.position = i;
    });
  }
  return next;
}

/**
 * Apply a completion toggle with a *bidirectional, consistent* parent/child
 * cascade. Returns a new array; every task whose `completed` actually changes
 * gets its `updated_at` bumped to `ts`.
 *
 *  - Toggling a parent sets every child to the same state (check → all done,
 *    uncheck → all undone).
 *  - Toggling a child reconciles the parent: if every sibling is now complete
 *    the parent auto-completes; if any sibling is incomplete the parent
 *    auto-uncompletes.
 */
export function applyCompletion(
  tasks: Task[],
  taskId: string,
  checked: boolean,
  ts: string
): Task[] {
  const target = tasks.find(t => t.id === taskId);
  if (!target) return tasks;

  const withCompletion = (task: Task, completed: boolean): Task => ({
    ...task,
    completed,
    updated_at: ts,
    ...(completed ? { remind_at: null, reminder_revision: null } : {}),
  });

  let next = tasks.map(t => (t.id === taskId ? withCompletion(t, checked) : t));

  if (!target.parent_id) {
    // Parent toggled → cascade to all of its children.
    next = next.map(t =>
      t.parent_id === taskId && t.completed !== checked
        ? withCompletion(t, checked)
        : t
    );
  } else {
    // Child toggled → reconcile the parent from its siblings.
    const parentId = target.parent_id;
    const siblings = next.filter(t => t.parent_id === parentId);
    const parentShouldBe =
      siblings.length > 0 && siblings.every(s => s.completed);
    next = next.map(t =>
      t.id === parentId && t.completed !== parentShouldBe
        ? withCompletion(t, parentShouldBe)
        : t
    );
  }

  return next;
}

/**
 * Non-destructive, id-based merge of local state with a fresh server read.
 * This replaces the old `tasks = fresh` clobber — the single biggest cause of
 * "my tasks disappeared".
 *
 *  - A task present on both sides resolves to whichever has the later
 *    `updated_at` (last-writer-wins); ties favour the local copy so an
 *    in-flight optimistic edit is never thrown away.
 *  - A task only on the server was added on another device → adopt it.
 *  - A task only local is a pending add not yet confirmed → keep it during
 *    recovery; a clean background sync can opt out so a remotely deleted task
 *    does not linger in the local UI.
 *  - Any id in `deletedIds` (a local tombstone awaiting flush) is dropped from
 *    both sides so a deleted task is never resurrected by a stale server row.
 *
 * The result is re-indexed for stable ordering. `keepLocalOnly` defaults to
 * true for WAL recovery, and is false once a clean session knows the server
 * is authoritative for non-pending rows.
 */
export function mergeTasks(
  local: Task[],
  server: Task[],
  deletedIds: Iterable<string> = [],
  options: { keepLocalOnly?: boolean } = {}
): Task[] {
  const keepLocalOnly = options.keepLocalOnly ?? true;
  const deleted = new Set(deletedIds);
  const localById = new Map(local.map(t => [t.id, t]));
  const serverById = new Map(server.map(t => [t.id, t]));

  const ids = new Set<string>([...localById.keys(), ...serverById.keys()]);
  const merged: Task[] = [];

  for (const id of ids) {
    if (deleted.has(id)) continue;
    const l = localById.get(id);
    const s = serverById.get(id);
    if (l && s) {
      merged.push(updatedMs(l) >= updatedMs(s) ? l : s);
    } else if (l && keepLocalOnly) {
      merged.push(l);
    } else if (s) {
      merged.push(s);
    }
  }

  return reindex(merged);
}

/** State the auto-sync consults before touching local tasks. */
export interface SyncGuardState {
  editingId: string | null;
  noteEditorActive: boolean;
  subtaskInputActive: boolean;
  isDragging: boolean;
  saving: boolean;
  dirty: boolean;
  saveError: boolean;
  signedOut: boolean;
}

/**
 * True only when it is safe for the background sync to merge server state in.
 * Blocked while the user is mid-interaction (editing, typing a subtask,
 * dragging) and while there is unsaved/failed local work that a merge could
 * race (`dirty`/`saveError`), or when signed out.
 */
export function canSync(s: SyncGuardState): boolean {
  return (
    !s.editingId &&
    !s.noteEditorActive &&
    !s.subtaskInputActive &&
    !s.isDragging &&
    !s.saving &&
    !s.dirty &&
    !s.saveError &&
    !s.signedOut
  );
}
