-- User modules: persists custom modules and built-in module overrides.
-- Replaces the localStorage-only approach so data survives cache clears
-- and syncs across devices.

CREATE TABLE IF NOT EXISTS user_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- For custom modules: the generated 'custom-…' id.
    -- For overrides on built-in modules: the registry id (e.g. 'todo', 'coffee').
    module_id TEXT NOT NULL,

    display_name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL CHECK (category IN ('journey', 'learn')),

    -- true  → user-created tile (the full definition lives here).
    -- false → override on a built-in module (only patched fields matter).
    is_custom BOOLEAN NOT NULL DEFAULT true,

    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_user_modules_user_id ON user_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_lookup ON user_modules(user_id, is_custom);

-- RLS
ALTER TABLE user_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own modules" ON user_modules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own modules" ON user_modules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own modules" ON user_modules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own modules" ON user_modules FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at (reuses the existing trigger function).
CREATE TRIGGER update_user_modules_updated_at BEFORE UPDATE ON user_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
