-- Migration: support quote-deep-dive caching
--
-- Two changes to content_cache:
--   1. Allow 'quote-deep-dive' as a content_type.
--   2. Relax date_key from DATE to TEXT so it can hold a stable hash key
--      derived from the (author, quote) pair. Existing date-string rows
--      cast cleanly to text; the column keeps the same name.

ALTER TABLE content_cache
  DROP CONSTRAINT IF EXISTS content_cache_content_type_check;

ALTER TABLE content_cache
  ADD CONSTRAINT content_cache_content_type_check
  CHECK (content_type IN (
    'food-plan',
    'analytics',
    'transportation-physics',
    'french-sound',
    'exercise-plan',
    'weekly-exercise',
    'archive',
    'classic-rock-500',
    'quote-deep-dive'
  ));

ALTER TABLE content_cache
  ALTER COLUMN date_key TYPE TEXT USING date_key::text;
