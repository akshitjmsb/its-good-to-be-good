# Content Generation Troubleshooting

Current generation order:
1. Supabase cache
2. Perplexity (if `VITE_PERPLEXITY_API_KEY` exists)
3. Local fallback content

There are no runtime content API routes in this project state.

## Quick Checks

1. Verify local Supabase status:
```bash
supabase status --output json
```
Confirm `API_URL` is `http://127.0.0.1:54321`.

2. Confirm local env values in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PERPLEXITY_API_KEY` (optional)

3. Confirm app build health:
```bash
npm run type-check
npm run build
```

4. Smoke test local pages:
```bash
node test-content-generation.js
```

## Common Symptoms

### Content does not change day-to-day
- Cause: cache hit for that day
- Action: check `content_cache` rows for the date and `user_id=00000000-0000-0000-0000-000000000000`

### Perplexity not used
- Cause: key missing or invalid
- Action: set `VITE_PERPLEXITY_API_KEY`; if not set, local fallback is expected

### Guitar tab errors without API key
- Cause: stale bundle or outdated local env/session
- Action: restart dev server and hard refresh browser

## Notes

- Local mode is the primary target.
- Cron-based generation is intentionally not used in this setup.
