-- Backfill the migration that commit c53706a ("feat(todo): add
-- drag-to-reorder and subtask support") described but never committed.
--
-- The Todo app reads and writes `position` and `parent_id` on every load
-- and save (see src/infra/supabase/persistence.ts). Without these columns
-- every tasks query errors and tasks silently fail to persist.
--
-- Written idempotently (IF NOT EXISTS) so it is safe to apply whether or
-- not the columns were already added to the live database by hand.

-- Ordering of top-level tasks and of subtasks within a parent.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Self-referencing parent for subtasks. ON DELETE CASCADE so deleting a
-- parent removes its children server-side, matching the client which
-- drops children when their parent is deleted.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Lookups: children-of-parent, and per-user ordered fetch.
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_position ON tasks(user_id, position);

NOTIFY pgrst, 'reload schema';
