# Access Token Setup (Deprecated for This Repo)

This project no longer requires any remote Supabase access-token flow for normal development.

## Current Standard

Use local Supabase only:

```bash
npm run supabase:setup
cp .env.example .env.local
npm run dev
```

## Why this changed

- Local-first development reliability
- No remote project linking required for day-to-day work
- Reduced risk of credential leakage in setup docs

## Security Reminder

- Never commit `.env.local`.
- Never commit API keys, tokens, or credentials.
