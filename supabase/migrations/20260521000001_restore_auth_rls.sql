-- Phase 4 migration #2: restore real auth.uid()-based RLS.
--
-- The pre-auth migrations (20240101000001, 20260225120000) hardcoded the
-- RLS policies to the anonymous UUID and dropped the auth.users foreign
-- keys. Now that the app authenticates against Supabase Auth and the
-- claim_legacy_data() RPC has reattributed existing rows, swap RLS back
-- to standard "row belongs to auth.uid()" policies and restore the FKs.
--
-- Apply order:
--   1. Deploy app code that gates render on a real session.
--   2. Sign up the bootstrap user.
--   3. Call select claim_legacy_data() once (the client does this on the
--      first authed boot).
--   4. Apply this migration.

-- 1. Drop the anonymous-user policies.
DROP POLICY IF EXISTS "Anonymous user can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous user can manage chat history" ON chat_history;
DROP POLICY IF EXISTS "Anonymous user can manage poetry recents" ON poetry_recents;
DROP POLICY IF EXISTS "Anonymous user can manage content cache" ON content_cache;
DROP POLICY IF EXISTS "Anonymous user can manage generation flags" ON generation_flags;
DROP POLICY IF EXISTS "Anonymous user can manage guitar picks" ON guitar_recent_picks;
DROP POLICY IF EXISTS "Allow all for default user" ON learning_sessions;
DROP POLICY IF EXISTS "Allow all for default user" ON french_history;

-- 2. Recreate the standard per-user policies.

CREATE POLICY "Users can view own tasks"   ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat history"   ON chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat history" ON chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat history" ON chat_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat history" ON chat_history FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own poetry recents"   ON poetry_recents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own poetry recents" ON poetry_recents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own poetry recents" ON poetry_recents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own poetry recents" ON poetry_recents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own content cache"   ON content_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content cache" ON content_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content cache" ON content_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content cache" ON content_cache FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own generation flags"   ON generation_flags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generation flags" ON generation_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own generation flags" ON generation_flags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own generation flags" ON generation_flags FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own guitar picks"   ON guitar_recent_picks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own guitar picks" ON guitar_recent_picks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own guitar picks" ON guitar_recent_picks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own guitar picks" ON guitar_recent_picks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own french history"   ON french_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own french history" ON french_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own french history" ON french_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own french history" ON french_history FOR DELETE USING (auth.uid() = user_id);

-- learning_sessions already has per-user policies from 20260111154628; nothing
-- to recreate there now that the "default user" policy is gone.

-- 3. Drop the anon-UUID column defaults.
ALTER TABLE tasks               ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE chat_history        ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE poetry_recents      ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE content_cache       ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE generation_flags    ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE guitar_recent_picks ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE french_history      ALTER COLUMN user_id DROP DEFAULT;

-- 4. Tighten NOT NULL constraints on tables that were relaxed and restore
--    auth.users foreign keys. The claim RPC must have run beforehand;
--    otherwise the FK would fail for any remaining anon-UUID rows.

ALTER TABLE french_history ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE tasks               ADD CONSTRAINT tasks_user_id_fkey               FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE chat_history        ADD CONSTRAINT chat_history_user_id_fkey        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE poetry_recents      ADD CONSTRAINT poetry_recents_user_id_fkey      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE content_cache       ADD CONSTRAINT content_cache_user_id_fkey       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generation_flags    ADD CONSTRAINT generation_flags_user_id_fkey    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE guitar_recent_picks ADD CONSTRAINT guitar_recent_picks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE french_history      ADD CONSTRAINT french_history_user_id_fkey      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE learning_sessions   ADD CONSTRAINT learning_sessions_user_id_fkey   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
