-- Module archive: hides a module from the home page without losing data.
--
-- Adds an `archived_at` timestamp to user_modules. A non-null value means
-- the module is currently archived; null means active.
--
-- For built-in modules that have neither an override nor a custom row, we
-- write a placeholder row (is_custom=false, empty display_name+emoji) so
-- the archive state has somewhere to live. The override loader already
-- ignores rows with both fields empty, so this won't pollute the override
-- map.

ALTER TABLE user_modules
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX IF NOT EXISTS idx_user_modules_archived
    ON user_modules(user_id, archived_at);
