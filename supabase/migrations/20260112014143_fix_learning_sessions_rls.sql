-- Fix RLS policy for learning_sessions to explicitly target anon and authenticated roles

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all for default user" ON learning_sessions;

-- Recreate with explicit role targeting
CREATE POLICY "Allow all for default user" ON learning_sessions
    FOR ALL
    TO anon, authenticated
    USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Ensure grants are in place
GRANT ALL ON learning_sessions TO anon;
GRANT ALL ON learning_sessions TO authenticated;
GRANT ALL ON learning_sessions TO service_role;
