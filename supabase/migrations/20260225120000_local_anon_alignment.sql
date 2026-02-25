-- Align schema with local-only anonymous user model.
-- This removes auth.users foreign key coupling and sets a default user ID.

-- Drop foreign key constraints to auth.users for local anonymous workflow.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE chat_history DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey;
ALTER TABLE poetry_recents DROP CONSTRAINT IF EXISTS poetry_recents_user_id_fkey;
ALTER TABLE content_cache DROP CONSTRAINT IF EXISTS content_cache_user_id_fkey;
ALTER TABLE generation_flags DROP CONSTRAINT IF EXISTS generation_flags_user_id_fkey;
ALTER TABLE guitar_recent_picks DROP CONSTRAINT IF EXISTS guitar_recent_picks_user_id_fkey;

-- Default all user_id values to the shared local anonymous user.
ALTER TABLE tasks
  ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
ALTER TABLE chat_history
  ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
ALTER TABLE poetry_recents
  ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
ALTER TABLE content_cache
  ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
ALTER TABLE generation_flags
  ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
ALTER TABLE guitar_recent_picks
  ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

-- Expand allowed cached content types to include guitar pool data.
ALTER TABLE content_cache DROP CONSTRAINT IF EXISTS content_cache_content_type_check;

ALTER TABLE content_cache
  ADD CONSTRAINT content_cache_content_type_check
  CHECK (
    content_type IN (
      'food-plan',
      'analytics',
      'transportation-physics',
      'french-sound',
      'exercise-plan',
      'weekly-exercise',
      'archive',
      'classic-rock-500'
    )
  );
