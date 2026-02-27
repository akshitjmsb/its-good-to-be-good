-- Database Schema for It's Good To Be King
-- Initial migration: Create all tables, indexes, RLS policies, and triggers

-- 1. Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Poetry recents table
CREATE TABLE IF NOT EXISTS poetry_recents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    poet TEXT NOT NULL,
    language TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Content cache table
CREATE TABLE IF NOT EXISTS content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('food-plan', 'analytics', 'transportation-physics', 'french-sound', 'exercise-plan', 'weekly-exercise', 'archive')),
    date_key DATE NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_type, date_key)
);

-- 5. Generation flags table
CREATE TABLE IF NOT EXISTS generation_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('auto-generation-attempted', 'night-generation', 'archived')),
    date_key DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, flag_type, date_key)
);

-- 6. Guitar recent picks table
CREATE TABLE IF NOT EXISTS guitar_recent_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    song_title TEXT NOT NULL,
    artist TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_poetry_recents_user_id ON poetry_recents(user_id);
CREATE INDEX IF NOT EXISTS idx_poetry_recents_timestamp ON poetry_recents(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_content_cache_user_id ON content_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_content_cache_lookup ON content_cache(user_id, content_type, date_key);
CREATE INDEX IF NOT EXISTS idx_generation_flags_user_id ON generation_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_flags_lookup ON generation_flags(user_id, flag_type, date_key);
CREATE INDEX IF NOT EXISTS idx_guitar_recent_picks_user_id ON guitar_recent_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_guitar_recent_picks_created_at ON guitar_recent_picks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE poetry_recents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE guitar_recent_picks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for chat_history
CREATE POLICY "Users can view own chat history" ON chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat history" ON chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat history" ON chat_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat history" ON chat_history FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for poetry_recents
CREATE POLICY "Users can view own poetry recents" ON poetry_recents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own poetry recents" ON poetry_recents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own poetry recents" ON poetry_recents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own poetry recents" ON poetry_recents FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for content_cache
CREATE POLICY "Users can view own content cache" ON content_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content cache" ON content_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content cache" ON content_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content cache" ON content_cache FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for generation_flags
CREATE POLICY "Users can view own generation flags" ON generation_flags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generation flags" ON generation_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own generation flags" ON generation_flags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own generation flags" ON generation_flags FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for guitar_recent_picks
CREATE POLICY "Users can view own guitar picks" ON guitar_recent_picks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own guitar picks" ON guitar_recent_picks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own guitar picks" ON guitar_recent_picks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own guitar picks" ON guitar_recent_picks FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_cache_updated_at BEFORE UPDATE ON content_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

