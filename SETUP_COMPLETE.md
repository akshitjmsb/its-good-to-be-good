# Setup Complete (Local Supabase)

Your project is configured for local-only Supabase development.

## Completed Flow

1. Local Supabase services started
2. Local migrations applied
3. Local API URL and publishable key available from `supabase status --output json`

## Standard Commands

```bash
npm run supabase:setup
npm run supabase:start
npm run supabase:push
npm run supabase:stop
```

## Required Local Env

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status>
VITE_PERPLEXITY_API_KEY=<optional local key>
```

## Runtime Notes

- Single local anonymous user: `00000000-0000-0000-0000-000000000000`
- Content order: `Supabase cache -> Perplexity -> local fallback`
- No Vercel KV runtime dependency

## Security

- Never commit `.env.local`.
- Never commit API keys, tokens, or credentials.
