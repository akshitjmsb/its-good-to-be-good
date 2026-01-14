-- Create french_history table for the French Translator app
CREATE TABLE IF NOT EXISTS french_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  mode TEXT NOT NULL CHECK (mode IN ('en-to-fr', 'fr-to-en')),
  source_text TEXT NOT NULL,
  translation TEXT NOT NULL,
  meaning TEXT NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_french_history_user_created
  ON french_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE french_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for default user
CREATE POLICY "Allow all for default user" ON french_history
  FOR ALL
  TO anon, authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
