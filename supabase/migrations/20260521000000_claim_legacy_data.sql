-- Phase 4 migration #1: legacy-data claim.
--
-- The pre-auth era of King tagged every row with the anonymous UUID
-- (00000000-0000-0000-0000-000000000000). Now that real Supabase Auth
-- is wired in, the first authenticated user reattributes those rows to
-- their auth.uid() via this SECURITY DEFINER RPC.
--
-- A single-row state table guards against double-claiming. After the
-- second migration restores real RLS, the anon rows would be invisible
-- to clients anyway, so this is the only window in which the claim can
-- happen.

CREATE TABLE IF NOT EXISTS legacy_claim_state (
    singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
    claimed_by UUID,
    claimed_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.claim_legacy_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target UUID := auth.uid();
    anon CONSTANT UUID := '00000000-0000-0000-0000-000000000000';
    already RECORD;
BEGIN
    IF target IS NULL THEN
        RAISE EXCEPTION 'claim_legacy_data requires an authenticated session';
    END IF;

    SELECT * INTO already FROM legacy_claim_state LIMIT 1;
    IF already.claimed_by IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already_claimed',
            'claimed_by', already.claimed_by,
            'claimed_at', already.claimed_at
        );
    END IF;

    UPDATE tasks               SET user_id = target WHERE user_id = anon;
    UPDATE chat_history        SET user_id = target WHERE user_id = anon;
    UPDATE poetry_recents      SET user_id = target WHERE user_id = anon;
    UPDATE content_cache       SET user_id = target WHERE user_id = anon;
    UPDATE generation_flags    SET user_id = target WHERE user_id = anon;
    UPDATE guitar_recent_picks SET user_id = target WHERE user_id = anon;
    UPDATE learning_sessions   SET user_id = target WHERE user_id = anon;
    UPDATE french_history      SET user_id = target WHERE user_id = anon;
    -- user_modules already pointed at auth.users(id), so there is nothing
    -- under the anon UUID there to claim.

    INSERT INTO legacy_claim_state (singleton, claimed_by, claimed_at)
    VALUES (true, target, NOW())
    ON CONFLICT (singleton) DO UPDATE
        SET claimed_by = EXCLUDED.claimed_by,
            claimed_at = EXCLUDED.claimed_at;

    RETURN jsonb_build_object('status', 'claimed', 'user_id', target);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_legacy_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_legacy_data() TO authenticated;
