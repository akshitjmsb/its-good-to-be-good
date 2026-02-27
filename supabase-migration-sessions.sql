-- Migration: Add learning_sessions table for It's Good To Be King
-- Run this SQL in your Supabase SQL Editor

-- 1. Create learning_sessions table (session-based instead of date-based)
CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'french',
        'food',
        'analytics',
        'physics',
        'exercise',
        'guitar',
        'poetry',
        'coffee',
        'tennis',
        'history',
        'geopolitics',
        'hood'
    )),
    content JSONB NOT NULL,
    title TEXT,  -- Optional title/summary for the session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id
    ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_content_type
    ON learning_sessions(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_recent
    ON learning_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_by_topic
    ON learning_sessions(user_id, content_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_sessions
-- Allow all operations for the default anonymous user
CREATE POLICY "Allow all for default user" ON learning_sessions
    FOR ALL
    USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Also allow authenticated users to manage their own sessions
CREATE POLICY "Users can view own sessions" ON learning_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON learning_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON learning_sessions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON learning_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_learning_sessions_updated_at
    BEFORE UPDATE ON learning_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Migrate existing content_cache data to learning_sessions
-- This converts date-based content to session-based
-- Uncomment and run if you want to preserve existing content
/*
INSERT INTO learning_sessions (user_id, content_type, content, created_at)
SELECT
    user_id,
    CASE content_type
        WHEN 'french-sound' THEN 'french'
        WHEN 'transportation-physics' THEN 'physics'
        WHEN 'food-plan' THEN 'food'
        WHEN 'exercise-plan' THEN 'exercise'
        WHEN 'weekly-exercise' THEN 'exercise'
        ELSE content_type
    END as content_type,
    content,
    created_at
FROM content_cache
WHERE content_type NOT IN ('archive', 'classic-rock-500');
*/
